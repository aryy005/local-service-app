# Localfixr Proguard Rules
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class androidx.swiperefreshlayout.widget.SwipeRefreshLayout { *; }
