package com.doitnow.admin;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String HIGH_PRIORITY_CHANNEL_ID = "high_priority";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createHighPriorityNotificationChannel();
    }

    private void createHighPriorityNotificationChannel() {
        // Create notification channel only for Android O (API 26) and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);

            // Check if channel already exists
            if (notificationManager != null && notificationManager.getNotificationChannel(HIGH_PRIORITY_CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        HIGH_PRIORITY_CHANNEL_ID,
                        "High Priority Notifications",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("WhatsApp-like urgent notifications");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{500, 500});
                channel.setBypassDnd(true); // Bypass Do Not Disturb mode
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC); // Show on lock screen

                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
