# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# --- Required once minifyEnabled is true (see build.gradle) ---
#
# Capacitor's WebView-to-native bridge finds plugin classes and their
# @PluginMethod-annotated methods via reflection at runtime, not normal
# compile-time references — R8 has no way to know they're used unless
# told explicitly, and will otherwise strip or rename them, which
# silently breaks every native API call (camera, filesystem, etc.) the
# moment a real release build runs, even though it looks fine in a debug
# build (minifyEnabled false) or in the emulator during development.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# WebView JS interfaces generally need their public members preserved —
# this is the standard Android guidance for any addJavascriptInterface
# usage, which Capacitor's bridge relies on internally.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
