# Kiro - Requirements: care-reminders

Status: APPROVED by owner 17 Nov 2026 (including generating VAPID keys).

## Requirements (EARS)

1. WHERE the app runs on the home device, THE SYSTEM SHALL offer "Turn on reminders"; permission SHALL be asked only when pressed.
2. WHEN an egg is ready to hatch, THE SYSTEM SHALL send "Your egg is hatching" to the carer's devices with reminders on.
3. WHEN the carer's local time reaches the Haggling's breakfast, dinner or bed hour, THE SYSTEM SHALL send one reminder for that meal or bedtime that day.
4. WHEN Hunger, Mood or Energy reaches 0, or Mess reaches 100, THE SYSTEM SHALL send one reminder for that event; it SHALL NOT repeat until the bar has recovered and emptied again.
5. Reminder times SHALL use the device's timezone, recorded with the subscription.
6. Tapping a reminder SHALL open the app.
7. WHEN a push endpoint is gone (HTTP 404/410), THE SYSTEM SHALL delete that subscription.
8. THE carer SHALL be able to turn reminders off (deletes the subscription).

## Security considerations
VAPID private key only in Supabase secrets; public key in the app (public by design). Reminder job callable only with the cron secret. Subscriptions readable and deletable only by their owner (RLS). Notification text contains no email or personal answers.

## Non-goals
Marketing pushes, push to signed-out devices, iPhone browser tabs (iPhone push needs the home-screen app).
