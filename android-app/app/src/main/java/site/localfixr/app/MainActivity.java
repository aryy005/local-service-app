package site.localfixr.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * Native Production Shell for Localfixr
 * Seamlessly connects to the live Localfixr platform (https://localfixr.site)
 * with native geolocation, file chooser, deep links (WhatsApp, UPI, Phone),
 * pull-to-refresh, and offline protection.
 */
public class MainActivity extends AppCompatActivity {

    public static final String PRODUCTION_URL = "https://localfixr.site";
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private View offlineContainer;
    private Button btnRetry;

    // File Upload Callback
    private ValueCallback<Uri[]> fileUploadCallback;

    // Geolocation Callback for Permission Dialogs
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    // Double-tap back to exit
    private boolean doubleBackToExitPressedOnce = false;

    // Permission Launchers
    private ActivityResultLauncher<String[]> locationPermissionLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Ensure status bar is clean white with crisp dark icons to match Image 2
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            getWindow().setStatusBarColor(android.graphics.Color.WHITE);
        }

        initViews();
        setupPermissionLaunchers();
        setupWebView();
        setupNetworkObserver();
        setupBackNavigation();

        loadHomeUrl();
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        progressBar = findViewById(R.id.progressBar);
        offlineContainer = findViewById(R.id.offlineContainer);
        btnRetry = findViewById(R.id.btnRetry);

        // Customize SwipeRefresh colors to match Localfixr brand
        swipeRefresh.setColorSchemeColors(
                ContextCompat.getColor(this, R.color.accent_yellow),
                ContextCompat.getColor(this, R.color.primary_dark)
        );
        swipeRefresh.setProgressBackgroundColorSchemeColor(
                ContextCompat.getColor(this, R.color.card_dark)
        );

        swipeRefresh.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                if (isNetworkAvailable()) {
                    webView.reload();
                } else {
                    swipeRefresh.setRefreshing(false);
                    showOfflineView(true);
                }
            }
        });

        btnRetry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isNetworkAvailable()) {
                    showOfflineView(false);
                    webView.loadUrl(PRODUCTION_URL);
                } else {
                    Toast.makeText(MainActivity.this, "Still offline. Please check your internet connection.", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void setupPermissionLaunchers() {
        locationPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                result -> {
                    boolean fineLocationGranted = Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_FINE_LOCATION));
                    boolean coarseLocationGranted = Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_COARSE_LOCATION));

                    if (pendingGeoCallback != null && pendingGeoOrigin != null) {
                        boolean granted = fineLocationGranted || coarseLocationGranted;
                        pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                        pendingGeoCallback = null;
                        pendingGeoOrigin = null;
                    }
                }
        );
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setGeolocationEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        // Identify as Localfixr native Android app
        String customUA = settings.getUserAgentString() + " LocalfixrAndroidApp/1.0.0";
        settings.setUserAgentString(customUA);

        webView.setWebViewClient(new LocalfixrWebViewClient());
        webView.setWebChromeClient(new LocalfixrWebChromeClient());
    }

    private void loadHomeUrl() {
        if (isNetworkAvailable()) {
            showOfflineView(false);
            webView.loadUrl(PRODUCTION_URL);
        } else {
            showOfflineView(true);
        }
    }

    private void showOfflineView(boolean show) {
        if (show) {
            offlineContainer.setVisibility(View.VISIBLE);
            swipeRefresh.setVisibility(View.GONE);
        } else {
            offlineContainer.setVisibility(View.GONE);
            swipeRefresh.setVisibility(View.VISIBLE);
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network network = cm.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
            return capabilities != null && (
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
            );
        } else {
            android.net.NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        }
    }

    private void setupNetworkObserver() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();

            cm.registerNetworkCallback(request, new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(@NonNull Network network) {
                    runOnUiThread(() -> {
                        if (offlineContainer.getVisibility() == View.VISIBLE) {
                            showOfflineView(false);
                            webView.reload();
                        }
                    });
                }
            });
        }
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    if (doubleBackToExitPressedOnce) {
                        finish();
                        return;
                    }

                    doubleBackToExitPressedOnce = true;
                    Toast.makeText(MainActivity.this, getString(R.string.exit_prompt), Toast.LENGTH_SHORT).show();

                    new Handler(Looper.getMainLooper()).postDelayed(() -> doubleBackToExitPressedOnce = false, 2000);
                }
            }
        });
    }

    // Handle File Chooser Activity Result (Camera / Gallery Uploads)
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback == null) {
                super.onActivityResult(requestCode, resultCode, data);
                return;
            }

            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                } else if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }

            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
    }

    /**
     * Custom WebViewClient handling external application schemes
     * (WhatsApp chats, UPI payments, Phone dialer, Google Maps).
     */
    private class LocalfixrWebViewClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            return handleUrlIntent(url);
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrlIntent(url);
        }

        private boolean handleUrlIntent(String url) {
            if (url == null) return false;

            // Handle WhatsApp, Phone calls, UPI intents, Mail, and Maps
            if (url.startsWith("whatsapp:") ||
                url.startsWith("tel:") ||
                url.startsWith("mailto:") ||
                url.startsWith("upi:") ||
                url.startsWith("geo:") ||
                url.startsWith("intent:") ||
                url.contains("api.whatsapp.com") ||
                url.contains("wa.me")) {

                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (ActivityNotFoundException e) {
                    if (url.startsWith("whatsapp:") || url.contains("wa.me")) {
                        Toast.makeText(MainActivity.this, "WhatsApp is not installed on this device", Toast.LENGTH_SHORT).show();
                    } else if (url.startsWith("upi:")) {
                        Toast.makeText(MainActivity.this, "No compatible UPI app found (Google Pay, PhonePe, Paytm)", Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(MainActivity.this, "No application found to handle this request", Toast.LENGTH_SHORT).show();
                    }
                    return true;
                }
            }

            // Keep internal navigation inside WebView
            return false;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            progressBar.setVisibility(View.GONE);
            swipeRefresh.setRefreshing(false);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                swipeRefresh.setRefreshing(false);
                progressBar.setVisibility(View.GONE);
                showOfflineView(true);
            }
        }
    }

    /**
     * Custom WebChromeClient supporting Progress, Geolocation permissions, and Image Uploads.
     */
    private class LocalfixrWebChromeClient extends WebChromeClient {

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            super.onProgressChanged(view, newProgress);
            progressBar.setProgress(newProgress);
            if (newProgress >= 100) {
                progressBar.setVisibility(View.GONE);
            } else if (progressBar.getVisibility() != View.VISIBLE) {
                progressBar.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            boolean hasFine = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            boolean hasCoarse = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

            if (hasFine || hasCoarse) {
                callback.invoke(origin, true, false);
            } else {
                pendingGeoCallback = callback;
                pendingGeoOrigin = origin;
                locationPermissionLauncher.launch(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                });
            }
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (fileUploadCallback != null) {
                fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = null;
            }

            fileUploadCallback = filePathCallback;

            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("image/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

            try {
                startActivityForResult(Intent.createChooser(intent, "Select Image or Take Photo"), FILE_CHOOSER_REQUEST_CODE);
                return true;
            } catch (ActivityNotFoundException e) {
                fileUploadCallback = null;
                Toast.makeText(MainActivity.this, "Cannot open file chooser", Toast.LENGTH_SHORT).show();
                return false;
            }
        }
    }
}
