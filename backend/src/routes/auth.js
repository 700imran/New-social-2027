import { Hono } from 'hono'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from 'hono/cookie'

import {
  adminClient,
  userClient,
} from '../lib/supabase.js'

import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'

import {
  checkEmailDeliverability,
  checkRateLimit,
  clientKey,
  isStrongPassword,
  isValidEmail,
  requireText,
  verifyTurnstile,
  LIMITS,
} from '../lib/security.js'

import {
  sendWelcomeEmail,
  sendConfirmationEmail,
} from '../lib/email.js'

const auth = new Hono()

const REFRESH_COOKIE = 'bs_rt'

const REFRESH_COOKIE_MAX_AGE =
  60 * 60 * 24 * 30 // 30 days

// ---------------------------------------------------------------------
// Refresh-token cookie helpers
// ---------------------------------------------------------------------

function setRefreshCookie(c, refreshToken) {
  setCookie(
    c,
    REFRESH_COOKIE,
    refreshToken,
    {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/v1/auth',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    }
  )
}

function clearRefreshCookie(c) {
  deleteCookie(
    c,
    REFRESH_COOKIE,
    {
      path: '/v1/auth',
      secure: true,
      sameSite: 'None',
    }
  )
}

// ---------------------------------------------------------------------
// Generic authentication error
// ---------------------------------------------------------------------

const GENERIC_AUTH_ERROR =
  'Invalid credentials, or this account is not yet confirmed.'

// ---------------------------------------------------------------------
// POST /v1/auth/signup
//
// Body:
// {
//   email?,
//   phone?,
//   password,
//   displayName,
//   turnstileToken?,
//   website?
// }
//
// EMAIL FLOW:
//
// generateLink({
//   type: 'signup',
//   email,
//   password
// })
//
// creates the Auth user and generates the confirmation link.
//
// We then send that link through Resend.
//
// PHONE FLOW:
//
// createUser({
//   phone,
//   password,
//   phone_confirm: false
// })
//
// is retained for the existing phone flow.
// ---------------------------------------------------------------------

auth.post('/signup', async (c) => {
  // -------------------------------------------------------------------
  // Rate limit
  // -------------------------------------------------------------------

  const rate = await checkRateLimit(
    c.env,
    'AUTH_RATE_LIMITER',
    clientKey(c)
  )

  if (!rate.allowed) {
    return c.json(
      {
        error:
          'Too many attempts — please wait a minute and try again.',
      },
      429
    )
  }

  // -------------------------------------------------------------------
  // Request body
  // -------------------------------------------------------------------

  const {
    email,
    phone,
    password,
    displayName,
    turnstileToken,
    website,
  } = await c.req.json().catch(() => ({}))

  // -------------------------------------------------------------------
  // Honeypot
  // -------------------------------------------------------------------

  if (website) {
    return c.json(
      {
        userId: 'ok',
      },
      201
    )
  }

  // -------------------------------------------------------------------
  // Turnstile
  // -------------------------------------------------------------------

  const turnstile = await verifyTurnstile(
    c.env,
    turnstileToken,
    clientKey(c)
  )

  if (!turnstile.ok) {
    return c.json(
      {
        error: turnstile.error,
      },
      400
    )
  }

  // -------------------------------------------------------------------
  // Validate identity
  // -------------------------------------------------------------------

  if (!email && !phone) {
    return c.json(
      {
        error: 'email or phone is required',
      },
      400
    )
  }

  if (email && !isValidEmail(email)) {
    return c.json(
      {
        error: 'Enter a valid email address',
      },
      400
    )
  }

  if (email) {
    const deliverabilityError =
      await checkEmailDeliverability(email)

    if (deliverabilityError) {
      return c.json(
        {
          error: deliverabilityError,
        },
        400
      )
    }
  }

  // -------------------------------------------------------------------
  // Password
  // -------------------------------------------------------------------

  if (!isStrongPassword(password)) {
    return c.json(
      {
        error:
          'Password must be at least 8 characters and include a letter and a number',
      },
      400
    )
  }

  // -------------------------------------------------------------------
  // Display name
  // -------------------------------------------------------------------

  const name = requireText(
    displayName,
    {
      field: 'displayName',
      max: LIMITS.displayName,
      required: false,
    }
  )

  if (name.error) {
    return c.json(
      {
        error: name.error,
      },
      400
    )
  }

  const supabase = adminClient(c.env)

  // -------------------------------------------------------------------
  // CREATE SUPABASE AUTH USER
  //
  // IMPORTANT:
  //
  // For EMAIL signup we use generateLink().
  //
  // DO NOT call admin.createUser() first.
  //
  // generateLink(type: 'signup') creates the user and gives us
  // the secure confirmation action link.
  // -------------------------------------------------------------------

  let data
  let error
  let confirmationUrl = null

  if (email) {
    const result =
      await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: {
          redirectTo:
            `${c.env.FRONTEND_URL}/auth/callback`,
          data: {
            display_name:
              name.value || 'New user',
          },
        },
      })

    data = result.data
    error = result.error

    confirmationUrl =
      data?.properties?.action_link || null
  } else {
    // -----------------------------------------------------------------
    // PHONE SIGNUP
    //
    // Keep the existing phone behavior.
    // -----------------------------------------------------------------

    const result =
      await supabase.auth.admin.createUser({
        phone,
        password,
        phone_confirm: false,
        user_metadata: {
          display_name:
            name.value || 'New user',
        },
      })

    data = result.data
    error = result.error
  }

  // -------------------------------------------------------------------
  // Auth creation failed
  // -------------------------------------------------------------------

  if (error || !data?.user) {
    console.error(
      'Signup: Supabase Auth user creation failed',
      error
    )

    return c.json(
      {
        error:
          'Could not create this account — it may already be registered.',
      },
      400
    )
  }

  const userId = data.user.id

  // -------------------------------------------------------------------
  // Email signup requires a confirmation link.
  // -------------------------------------------------------------------

  if (email && !confirmationUrl) {
    console.error(
      'Signup: Supabase returned no confirmation action link'
    )

    await supabase.auth.admin
      .deleteUser(userId)
      .catch((rollbackError) => {
        console.error(
          'Signup: failed to roll back Auth user',
          rollbackError
        )
      })

    return c.json(
      {
        error:
          'Could not prepare your confirmation email — please try again.',
      },
      500
    )
  }

  // -------------------------------------------------------------------
  // Mirror identity into public.users
  // -------------------------------------------------------------------

  const {
    error: usersError,
  } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email || null,
      phone: phone || null,
    })

  // -------------------------------------------------------------------
  // Create profile
  // -------------------------------------------------------------------

  const {
    error: profileError,
  } = usersError
    ? { error: usersError }
    : await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          display_name:
            name.value || 'New user',
        })

  // -------------------------------------------------------------------
  // Rollback if users/profile creation failed
  // -------------------------------------------------------------------

  if (usersError || profileError) {
    console.error(
      'Signup failed after Auth user creation — rolling back',
      {
        usersError,
        profileError,
      }
    )

    await supabase.auth.admin
      .deleteUser(userId)
      .catch((rollbackError) => {
        console.error(
          'Signup: rollback also failed',
          rollbackError
        )
      })

    return c.json(
      {
        error:
          'Could not finish creating your account — please try again.',
      },
      500
    )
  }

  // -------------------------------------------------------------------
  // Consent + role
  // -------------------------------------------------------------------

  const [
    { error: consentError },
    { error: roleError },
  ] = await Promise.all([
    supabase
      .from('consent_preferences')
      .insert({
        user_id: userId,
      }),

    supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: 1,
      }),
  ])

  if (consentError) {
    console.error(
      'Signup: consent_preferences insert failed (non-fatal)',
      consentError
    )
  }

  if (roleError) {
    console.error(
      'Signup: user_roles insert failed (non-fatal)',
      roleError
    )
  }

  // -------------------------------------------------------------------
  // Audit log
  // -------------------------------------------------------------------

  await supabase
    .from('audit_log')
    .insert({
      actor_id: userId,
      action: 'signup',
      entity_type: 'user',
      entity_id: userId,
    })
    .then(({ error: auditError }) => {
      if (auditError) {
        console.error(
          'Signup: audit_log insert failed (non-fatal)',
          auditError
        )
      }
    })

  // -------------------------------------------------------------------
  // SEND CONFIRMATION EMAIL
  //
  // Supabase generated the secure action_link.
  // Resend delivers it.
  //
  // This is intentionally fire-and-forget so a Resend outage does not
  // roll back a successful account creation.
  // -------------------------------------------------------------------

  if (email && confirmationUrl) {
  sendConfirmationEmail(
    c.env,
    {
      to: email,
      displayName:
        name.value || 'there',
      confirmationUrl,
    }
  ).catch((e) => {
    console.error(
      'Signup: confirmation email failed',
      e
    )
  })
}



  //-----------------------------------------------------
  // WELCOME EMAIL
  //
  // WARNING:
  //
  // This sends a SECOND email.
  //
  // If you want only the confirmation email,
  // leave this block commented out.
  // -------------------------------------------------------------------

  /*
  if (email) {
    sendWelcomeEmail(c.env, {
      to: email,
      displayName: name.value || 'there',
    }).catch((e) => {
      console.error(
        'Signup: welcome email failed (non-fatal)',
        e
      )
    })
  }
  */

  // -------------------------------------------------------------------
  // Confirmation status
  // -------------------------------------------------------------------

  const needsConfirmation =
    Boolean(email) &&
    !data.user.email_confirmed_at

  return c.json(
    {
      userId,
      needsConfirmation,
    },
    201
  )
})

// ---------------------------------------------------------------------
// POST /v1/auth/login
// ---------------------------------------------------------------------

auth.post('/login', async (c) => {
  const {
    email,
    phone,
    password,
  } = await c.req.json().catch(() => ({}))

  const rate = await checkRateLimit(
    c.env,
    'AUTH_RATE_LIMITER',
    `${clientKey(c)}:${email || phone || ''}`
  )

  if (!rate.allowed) {
    return c.json(
      {
        error:
          'Too many attempts — please slow down.',
      },
      429
    )
  }

  if (
    !password ||
    (!email && !phone)
  ) {
    return c.json(
      {
        error: GENERIC_AUTH_ERROR,
      },
      401
    )
  }

  const supabase = adminClient(c.env)

  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword({
      email,
      phone,
      password,
    })

  if (error) {
    return c.json(
      {
        error: GENERIC_AUTH_ERROR,
      },
      401
    )
  }

  setRefreshCookie(
    c,
    data.session.refresh_token
  )

  return c.json({
    accessToken:
      data.session.access_token,
    expiresIn:
      data.session.expires_in,
    userId: data.user.id,
  })
})

// ---------------------------------------------------------------------
// POST /v1/auth/refresh
// ---------------------------------------------------------------------

auth.post('/refresh', async (c) => {
  const refreshToken =
    getCookie(
      c,
      REFRESH_COOKIE
    )

  if (!refreshToken) {
    return c.json(
      {
        error:
          'No session to refresh',
      },
      401
    )
  }

  const rate = await checkRateLimit(
    c.env,
    'REFRESH_RATE_LIMITER',
    clientKey(c)
  )

  if (!rate.allowed) {
    return c.json(
      {
        error:
          'Too many requests — please slow down.',
      },
      429
    )
  }

  const supabase =
    adminClient(c.env)

  const {
    data,
    error,
  } =
    await supabase.auth.refreshSession({
      refresh_token:
        refreshToken,
    })

  if (error) {
    clearRefreshCookie(c)

    return c.json(
      {
        error:
          'Session expired — please sign in again.',
      },
      401
    )
  }

  setRefreshCookie(
    c,
    data.session.refresh_token
  )

  return c.json({
    accessToken:
      data.session.access_token,
    expiresIn:
      data.session.expires_in,
    userId: data.user.id,
  })
})

// ---------------------------------------------------------------------
// POST /v1/auth/logout
// ---------------------------------------------------------------------

auth.post(
  '/logout',
  requireAuth,
  async (c) => {
    clearRefreshCookie(c)

    return c.json({
      ok: true,
    })
  }
)

// ---------------------------------------------------------------------
// POST /v1/auth/forgot-password
// ---------------------------------------------------------------------

auth.post(
  '/forgot-password',
  async (c) => {
    const {
      email,
      turnstileToken,
    } =
      await c.req.json().catch(
        () => ({})
      )

    const rate =
      await checkRateLimit(
        c.env,
        'AUTH_RATE_LIMITER',
        `${clientKey(c)}:${email || ''}`
      )

    const generic = {
      ok: true,
      message:
        'If an account exists for that email, a reset link is on its way.',
    }

    if (!rate.allowed) {
      return c.json(generic)
    }

    const turnstile =
      await verifyTurnstile(
        c.env,
        turnstileToken,
        clientKey(c)
      )

    if (!turnstile.ok) {
      return c.json(generic)
    }

    if (!isValidEmail(email)) {
      return c.json(generic)
    }

    const supabase =
      adminClient(c.env)

    await supabase.auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${c.env.FRONTEND_URL}/reset-password`,
        }
      )

    return c.json(generic)
  }
)

// ---------------------------------------------------------------------
// PATCH /v1/auth/password
// ---------------------------------------------------------------------

auth.patch(
  '/password',
  requireAuth,
  async (c) => {
    const {
      password,
    } =
      await c.req.json().catch(
        () => ({})
      )

    if (!isStrongPassword(password)) {
      return c.json(
        {
          error:
            'Password must be at least 8 characters and include a letter and a number',
        },
        400
      )
    }

    const supabase =
      userClient(
        c.env,
        c.get('jwt')
      )

    const { error } =
      await supabase.auth.updateUser({
        password,
      })

    if (error) {
      return dbError(
        c,
        error
      )
    }

    return c.json({
      ok: true,
    })
  }
)

// ---------------------------------------------------------------------
// POST /v1/auth/mfa/enroll
// ---------------------------------------------------------------------

auth.post(
  '/mfa/enroll',
  requireAuth,
  async (c) => {
    const supabase =
      adminClient(c.env)

    const {
      data,
      error,
    } =
      await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

    if (error) {
      return dbError(
        c,
        error
      )
    }

    return c.json(data)
  }
)

export default auth
