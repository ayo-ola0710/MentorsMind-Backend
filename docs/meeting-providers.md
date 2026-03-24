# Video Meeting Integration Guide

This document provides comprehensive information about the video meeting integration in MentorMinds Backend.

## Overview

The MentorMinds platform automatically generates video meeting links when session bookings are confirmed. This feature:

- ✅ Creates unique meeting rooms for each confirmed session
- ✅ Attaches meeting URLs to session records
- ✅ Sends notifications to both mentor and learner
- ✅ Supports multiple meeting providers
- ✅ Handles meeting room expiry (30 minutes after session end)
- ✅ Gracefully handles provider API failures

## Supported Providers

### 1. Daily.co (Recommended) ⭐

**Best for**: Professional, production-ready video rooms

**Pros:**
- Simple REST API
- No SDK required
- Reliable and scalable
- Built-in chat and screen sharing
- Custom branding options

**Cons:**
- Requires API key
- Paid service (free tier available)

**Setup:**
1. Sign up at [Daily.co](https://daily.co)
2. Get your API key from dashboard
3. Set `MEETING_PROVIDER=daily` in `.env`
4. Set `MEETING_API_KEY=your_daily_api_key`

### 2. Whereby

**Best for**: Simple embedded video rooms

**Pros:**
- Easy integration
- No downloads required for participants
- Good free tier

**Cons:**
- Limited customization
- API access requires paid plan

**Setup:**
1. Sign up at [Whereby.com](https://whereby.com)
2. Get API key from developer settings
3. Set `MEETING_PROVIDER=whereby` in `.env`
4. Set `MEETING_API_KEY=your_whereby_api_key`

### 3. Zoom

**Best for**: Enterprise environments already using Zoom

**Pros:**
- Familiar interface for users
- Enterprise-grade features
- Robust and reliable

**Cons:**
- More complex OAuth setup
- Requires Zoom app creation
- Rate limits on free accounts

**Setup:**
1. Create Zoom app at [Zoom Marketplace](https://marketplace.zoom.us)
2. Use Server-to-Server OAuth
3. Get API key and secret
4. Set `MEETING_PROVIDER=zoom` in `.env`
5. Set `MEETING_API_KEY=your_zoom_api_key`

### 4. Jitsi Meet (Self-Hosted) 🆓

**Best for**: Free, open-source solution

**Pros:**
- Completely free
- Self-hosted option
- No API key required
- Open source

**Cons:**
- Less polished than commercial options
- Self-hosting requires maintenance
- Public Jitsi servers may be unreliable

**Setup:**
1. Set `MEETING_PROVIDER=jitsi` in `.env`
2. Optionally set `JITSI_BASE_URL=https://meet.jit.si` (or your self-hosted URL)
3. No API key needed!

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Meeting Provider Configuration
MEETING_PROVIDER=daily          # Options: daily, whereby, zoom, jitsi
MEETING_API_KEY=your_api_key    # Required for Daily, Whereby, Zoom
MEETING_API_SECRET=             # Optional: Additional secret for some providers
MEETING_ROOM_EXPIRY_MINUTES=30   # Meeting rooms expire 30 min after session end
MEETING_RETRY_ATTEMPTS=1         # Retry attempts if provider API fails

# Jitsi specific (only if using Jitsi)
JITSI_BASE_URL=https://meet.jit.si
```

### Switching Providers

To switch meeting providers:

1. Update `MEETING_PROVIDER` in `.env`
2. Update `MEETING_API_KEY` if required
3. Restart the server

**Example: Switch from Daily to Jitsi**
```bash
# Before
MEETING_PROVIDER=daily
MEETING_API_KEY=daily_api_key_123

# After
MEETING_PROVIDER=jitsi
# No API key needed
```

## How It Works

### Booking Confirmation Flow

1. **User confirms booking** → `POST /api/v1/bookings/:id/confirm`
2. **System generates meeting URL** via selected provider
3. **Meeting URL attached to session** in database
4. **Notifications sent** to mentor and mentee via email
5. **Meeting room expires** 30 minutes after session end

### Database Schema

The migration adds these columns to the `sessions` table:

```sql
meeting_url VARCHAR(500)           -- The meeting room URL
meeting_provider VARCHAR(50)        -- Provider name (daily, whereby, etc.)
meeting_room_id VARCHAR(255)        -- Provider-specific room ID
meeting_expires_at TIMESTAMP        -- When the room expires
needs_manual_intervention BOOLEAN   -- Flag for failed meeting creations
```

### Error Handling

If the meeting provider API fails:

1. System retries once (configurable via `MEETING_RETRY_ATTEMPTS`)
2. If retry fails, session is marked with `needs_manual_intervention = TRUE`
3. Booking is still confirmed
4. Warning returned in API response
5. Admin can manually set up meeting room

**Admin endpoint to find problematic sessions:**
```http
GET /api/v1/bookings/manual-intervention
Authorization: Bearer <admin_token>
```

## API Endpoints

### Confirm Booking & Generate Meeting URL

```http
POST /api/v1/bookings/:id/confirm
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Booking confirmed and meeting room created successfully",
  "data": {
    "session": {
      "id": "uuid",
      "status": "confirmed",
      "meeting_url": "https://daily.co/room/xyz",
      "meeting_provider": "daily",
      "meeting_expires_at": "2026-03-24T12:30:00Z"
    }
  }
}
```

**Warning Response (if meeting creation failed):**
```json
{
  "status": "success",
  "message": "Booking confirmed but meeting URL could not be generated",
  "data": {
    "session": { ... },
    "warning": "Meeting room creation failed. Manual intervention required.",
    "details": "Error message here"
  }
}
```

### Get Session Details

```http
GET /api/v1/bookings/:id
Authorization: Bearer <token>
```

Meeting URL only visible if session status is `confirmed`.

### List User Sessions

```http
GET /api/v1/bookings
Authorization: Bearer <token>
Query: upcoming=true (optional)
```

Returns all sessions for authenticated user with filtered meeting URLs.

## Testing

### Run Tests

```bash
npm test -- bookings.test.ts
```

### Test Scenarios Covered

✅ Meeting URL generation on booking confirmation  
✅ Meeting URL expiry calculation  
✅ Provider API failure graceful handling  
✅ Notification delivery on meeting URL generation  
✅ Meeting URL visibility based on confirmation status  
✅ Manual intervention flagging  

### Manual Testing

1. **Test with Jitsi (no API key needed):**
```bash
# In .env.test
MEETING_PROVIDER=jitsi

npm test
```

2. **Test with Daily.co:**
```bash
# In .env.test
MEETING_PROVIDER=daily
MEETING_API_KEY=your_test_key

npm test
```

## Troubleshooting

### Meeting URLs Not Generating

**Check:**
1. Is `MEETING_PROVIDER` set correctly?
2. Is `MEETING_API_KEY` valid (if required)?
3. Check server logs for API errors
4. Verify network connectivity to provider API

### Provider API Errors

**Common issues:**
- Invalid API key → Check credentials
- Rate limiting → Reduce booking frequency or upgrade plan
- Network timeout → Check firewall/proxy settings

### Manual Intervention Required

When `needs_manual_intervention = TRUE`:

1. Admin receives alert (coming soon)
2. Admin manually creates meeting room
3. Admin updates session record:
```sql
UPDATE sessions 
SET meeting_url = 'manual_url',
    needs_manual_intervention = FALSE
WHERE id = 'session_id';
```

## Best Practices

### For Production

1. **Use Daily.co or Whereby** for reliability
2. **Monitor meeting creation failures** via admin dashboard
3. **Set up alerts** for manual intervention flags
4. **Configure proper email notifications** (integrate SendGrid/AWS SES)
5. **Test failover process** regularly

### For Development

1. **Use Jitsi** to avoid API costs during development
2. **Mock notification service** to avoid sending real emails
3. **Log meeting URLs** for testing purposes
4. **Test error scenarios** by using invalid API keys

### Security

1. **Never commit API keys** to version control
2. **Use environment variables** for all secrets
3. **Validate meeting URLs** before storing
4. **Expire meetings** appropriately
5. **Restrict manual intervention** to admins only

## Migration Guide

### Adding Meeting URLs to Existing Sessions

If you have existing sessions without meeting URLs:

```sql
-- Find sessions needing meeting URLs
SELECT id, scheduled_at, status 
FROM sessions 
WHERE meeting_url IS NULL 
  AND status = 'confirmed';

-- Manually add meeting URLs
UPDATE sessions
SET meeting_url = 'https://your-meeting-url.com/room'
WHERE id = 'session-id';
```

### Upgrading from Old Schema

The migration (`database/migrations/012_add_meeting_url_to_sessions.sql`) handles:
- Adding new columns safely
- Preserving old `meeting_link` data
- Creating appropriate indexes

## Future Enhancements

Planned improvements:
- [ ] Email provider integration (SendGrid, AWS SES)
- [ ] Automated expiry cleanup job
- [ ] Meeting room health monitoring
- [ ] Support for recurring sessions
- [ ] Custom meeting room branding
- [ ] Meeting analytics and tracking
- [ ] Webhook notifications for meeting events

## Support

For issues or questions:
- Check provider documentation (Daily, Whereby, Zoom, Jitsi)
- Review server logs for error details
- Test with Jitsi first (simplest setup)
- Create GitHub issue with error details

---

**Last Updated**: March 24, 2026  
**Version**: 1.0.0
