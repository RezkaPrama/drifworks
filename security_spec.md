# Apex DriftWorks — Security Specification (Phase 0)

## 1. Data Invariants
1. A `UserProfile` document at `/users/{userId}` can only be read, created, or updated by the verified user whose `request.auth.uid == userId`, with `uid == userId` immutable and server timestamps (`request.time`) enforced.
2. A `CarBuild` document at `/users/{userId}/builds/{carId}` cannot exist unless the parent `/users/{userId}` exists, `ownerId == request.auth.uid`, `carId == carId`, and all mechanical tiers (`0..2`), tuning sliders, and hex colors stay within bounded limits.
3. A `StorePurchase` receipt at `/users/{userId}/purchases/{purchaseId}` cannot exist without a parent `/users/{userId}`, must have `ownerId == request.auth.uid`, positive `amountIdr`, `status == 'completed'`, and is immutable once created (no client `update` or `delete`).
4. A `LeaderboardEntry` at `/tracks/{trackId}/leaderboard/{userId}` can only be written by the verified owner (`request.auth.uid == userId`), must enforce `userId == request.auth.uid` and `trackId == trackId`, and may be publicly listed only when `resource.data.trackId == trackId` and `resource.data.score >= 0`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Profile**: Create `/users/victimUid` as `attackerUid` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Write `/users/{uid}` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Profile**: Create `/users/{uid}` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
4. **Immutable UID Tampering**: Update `/users/{uid}` changing `uid` -> `PERMISSION_DENIED`.
5. **Backdated Timestamp Attack**: Create `/users/{uid}` with client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
6. **Negative Currency / Overflow**: Update `/users/{uid}` with `driftCoins: -500` or `reputation: 9999999999` -> `PERMISSION_DENIED`.
7. **Orphaned CarBuild**: Create `/users/nonExistent/builds/kitsune_s13` -> `PERMISSION_DENIED`.
8. **Illegal Part Tier Escalation**: Update `/users/{uid}/builds/kitsune_s13` with `engineTier: 99` -> `PERMISSION_DENIED`.
9. **1MB String Poisoning**: Create `/users/{uid}/builds/kitsune_s13` with 2KB `paintHex` or invalid regex -> `PERMISSION_DENIED`.
10. **Purchase Receipt Tampering**: Attempt `update` or `delete` on `/users/{uid}/purchases/{id}` -> `PERMISSION_DENIED`.
11. **Leaderboard Score Spoofing for Another User**: Write `/tracks/harbor_toybox/leaderboard/victimUid` as `attackerUid` -> `PERMISSION_DENIED`.
12. **Blanket User List Scraping**: Attempt `list` on `/users` -> `PERMISSION_DENIED`.
