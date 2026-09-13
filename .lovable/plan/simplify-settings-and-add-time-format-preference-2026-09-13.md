# Simplify Settings and add time format preference

## Changes
- Remove the empty-day sentence from Home while preserving the open-task count when present.
- Remove the Settings introduction caption and every helper caption except the exact version line.
- Remove Haptic feedback and Motion & animations from Settings.
- Move Hide Notes tab below the Calendar group and directly above About.
- Add a Calendar setting for 12-hour versus 24-hour time, saved on this device.
- Apply the selected clock format to visible event times throughout Home, Calendar day views, and event details.
- Prevent the Home page's date-based content from differing during initial page loading.

## Technical details
- Keep the existing `calendry.settings` saved preference object and settings-change event.
- Add a shared time formatting helper and preference hook so all time labels update immediately.
- Keep native time entry controls unchanged; only displayed time labels change.
