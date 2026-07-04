package com.realpathshala.app;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.getcapacitor.BridgeActivity;

/**
 * Hosts the Capacitor WebView and adds two things on top of the default bridge:
 *
 *  1. Edge-to-edge inset handling. Android 15 (targetSdk 35) forces edge-to-edge,
 *     which otherwise draws the web content behind the status bar and gesture bar.
 *     We go edge-to-edge on every version and pad the WebView container by the
 *     system-bar insets, so content always sits in the safe area while the bar
 *     strips are painted to match the current light/dark theme.
 *  2. Native pull-to-refresh via a SwipeRefreshLayout wrapping the WebView.
 *
 * Back navigation, file chooser, camera and downloads keep Capacitor's defaults.
 */
public class MainActivity extends BridgeActivity {

    private static final long REFRESH_TIMEOUT_MS = 8000;
    private static final int APP_DARK_BG = 0xFF0B1120;  // matches the web dark theme
    private static final int APP_LIGHT_BG = 0xFFFFFFFF;  // matches the web light theme

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebView webView = getBridge().getWebView();
        final ViewGroup parent = (ViewGroup) webView.getParent();
        final int index = parent.indexOfChild(webView);
        final ViewGroup.LayoutParams params = webView.getLayoutParams();

        // Re-parent the bridge WebView under a SwipeRefreshLayout in-place.
        parent.removeView(webView);
        final SwipeRefreshLayout swipe = new SwipeRefreshLayout(this);
        swipe.setColorSchemeColors(0xFF4F46E5); // brand indigo
        swipe.addView(
            webView,
            new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
        parent.addView(swipe, index, params);

        setUpEdgeToEdge(swipe);
        setUpPullToRefresh(swipe, webView);
    }

    /** Go edge-to-edge and pad the WebView container by the system-bar insets so
     *  content never sits under the status bar or the gesture/navigation bar. */
    private void setUpEdgeToEdge(final SwipeRefreshLayout swipe) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        final boolean night =
            (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;

        // The container's own background fills the inset strips behind the bars.
        swipe.setBackgroundColor(night ? APP_DARK_BG : APP_LIGHT_BG);

        // Dark bars → light icons, and vice-versa.
        final WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(!night);
        controller.setAppearanceLightNavigationBars(!night);

        ViewCompat.setOnApplyWindowInsetsListener(swipe, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }

    private void setUpPullToRefresh(final SwipeRefreshLayout swipe, final WebView webView) {
        final Handler handler = new Handler(Looper.getMainLooper());
        swipe.setOnRefreshListener(() -> {
            webView.reload();
            // Dismiss when the freshly reloaded page has been drawn…
            webView.postVisualStateCallback(
                0,
                new WebView.VisualStateCallback() {
                    @Override
                    public void onComplete(long requestId) {
                        swipe.setRefreshing(false);
                    }
                }
            );
            // …and as a fallback, never leave the spinner spinning forever.
            handler.postDelayed(() -> swipe.setRefreshing(false), REFRESH_TIMEOUT_MS);
        });

        // Only allow the pull gesture when the WebView is at the top, so it
        // doesn't hijack normal upward scrolling inside the page.
        swipe.setOnChildScrollUpCallback((p, child) -> webView.getScrollY() > 0);
    }
}
