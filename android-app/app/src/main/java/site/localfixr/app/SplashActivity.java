package site.localfixr.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Animated Splash Screen for Localfixr
 * Provides a fluid app-opening branding experience with scale and fade animations.
 */
public class SplashActivity extends AppCompatActivity {

    private static final int SPLASH_DURATION_MS = 2200;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        FrameLayout logoFrame = findViewById(R.id.logoFrame);
        TextView splashTitle = findViewById(R.id.splashTitle);
        TextView splashSubtitle = findViewById(R.id.splashSubtitle);
        View splashFooter = findViewById(R.id.splashFooter);

        // Load animations
        Animation scaleAnim = AnimationUtils.loadAnimation(this, R.anim.logo_scale);
        Animation fadeInUpAnim = AnimationUtils.loadAnimation(this, R.anim.fade_in_up);
        Animation footerAnim = AnimationUtils.loadAnimation(this, R.anim.fade_in_up);
        footerAnim.setStartOffset(400);

        // Run animations
        if (logoFrame != null) {
            logoFrame.startAnimation(scaleAnim);
        }
        if (splashTitle != null) {
            splashTitle.startAnimation(fadeInUpAnim);
        }
        if (splashSubtitle != null) {
            splashSubtitle.startAnimation(fadeInUpAnim);
        }
        if (splashFooter != null) {
            splashFooter.startAnimation(footerAnim);
        }

        // Add subtle continuous pulse to logo
        scaleAnim.setAnimationListener(new Animation.AnimationListener() {
            @Override
            public void onAnimationStart(Animation animation) {}

            @Override
            public void onAnimationEnd(Animation animation) {
                if (logoFrame != null) {
                    Animation pulse = AnimationUtils.loadAnimation(SplashActivity.this, R.anim.pulse);
                    logoFrame.startAnimation(pulse);
                }
            }

            @Override
            public void onAnimationRepeat(Animation animation) {}
        });

        // Transition to MainActivity
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!isFinishing()) {
                    Intent intent = new Intent(SplashActivity.this, MainActivity.class);
                    startActivity(intent);
                    overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                    finish();
                }
            }
        }, SPLASH_DURATION_MS);
    }
}
