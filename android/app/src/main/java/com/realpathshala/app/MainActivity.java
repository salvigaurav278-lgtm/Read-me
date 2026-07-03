package com.realpathshala.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.getcapacitor.BridgeActivity;

/**
 * Wraps the Capacitor bridge WebView in a {@link SwipeRefreshLayout} so the
 * hosted app supports native pull-to-refresh. The gesture only fires when the
 * page is scrolled to the very top, and the spinner is dismissed as soon as the
 * reloaded page's visual state is ready (with a safety timeout so it never
 * sticks). Back navigation, file chooser, camera and downloads keep using
 * Capacitor's default bridge behaviour untouched.
 */
public class MainActivity extends BridgeActivity {

    private static final long REFRESH_TIMEOUT_MS = 8000;

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
