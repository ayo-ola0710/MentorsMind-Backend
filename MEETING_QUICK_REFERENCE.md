# Video Meeting Integration - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### Option 1: Jitsi (Fastest - No API Key Needed)
```bash
# Add to .env
MEETING_PROVIDER=jitsi

# That's it! Restart server and you're done.
npm run dev
```

### Option 2: Daily.co (Recommended for Production)
```bash
# Add to .env
MEETING_PROVIDER=daily
MEETING_API_KEY=your_daily_api_key_here

# Get API key from: https://dashboard.daily.co
npm run dev
```

## 📋 Environment Variables

```bash
# Required
MEETING_PROVIDER=jitsi|daily|whereby|zoom

# For paid providers (Daily, Whereby, Zoom)
MEETING_API_KEY=your_api_key

# Optional
MEETING_ROOM_EXPIRY_MINUTES=30      # Default: 30
MEETING_RETRY_ATTEMPTS=1            # Default: 1
JITSI_BASE_URL=https://meet.jit.si  # Only for Jitsi
```

## 🔑 API Endpoints

### Confirm Booking → Auto-Generate Meeting URL
```http
POST /api/v1/bookings/:id/confirm
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "data": {
    "session": {
      "meeting_url": "https://...",
      "meeting_provider": "jitsi",
      "meeting_expires_at": "2026-03-24T12:30:00Z"
    }
  }
}
```

### Get Session with Meeting URL
```http
GET /api/v1/bookings/:id
Authorization: Bearer <token>
```

### List User Sessions
```http
GET /api/v1/bookings
Authorization: Bearer <token>
Query: upcoming=true (optional)
```

### Admin: Get Failed Meetings
```http
GET /api/v1/bookings/manual-intervention
Authorization: Bearer <admin_token>
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test meeting service specifically
npm test -- meeting.service.test.ts

# Test booking flow
npm test -- bookings.test.ts

# With coverage
npm run test:coverage
```

## 🔄 Switch Providers

```bash
# From Daily to Jitsi
MEETING_PROVIDER=daily → MEETING_PROVIDER=jitsi

# Restart server
npm run dev

# Done! All new meetings will use Jitsi
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No meeting URL generated | Check `MEETING_PROVIDER` is set |
| API key error | Verify `MEETING_API_KEY` is valid |
| Manual intervention flag | Check provider status + logs |
| Meeting URL not visible | Ensure session status = `confirmed` |

## 📁 Key Files

```
src/
├── config/meeting.config.ts          # Provider configuration
├── services/
│   ├── meeting.service.ts            # Meeting creation logic
│   └── notification.service.ts       # Email notifications
├── models/session.model.ts           # Database operations
├── controllers/bookings.controller.ts # API handlers
├── routes/bookings.routes.ts         # Route definitions
└── utils/meeting.utils.ts            # Helper functions

database/migrations/
└── 012_add_meeting_url_to_sessions.sql

docs/
└── meeting-providers.md              # Detailed guide
```

## 💾 Database Schema

```sql
sessions:
  - meeting_url VARCHAR(500)
  - meeting_provider VARCHAR(50)
  - meeting_room_id VARCHAR(255)
  - meeting_expires_at TIMESTAMP
  - needs_manual_intervention BOOLEAN
```

## ⚡ Flow Diagram

```
Booking Confirmation
        ↓
Create Meeting Room (Provider API)
        ↓
Update Session Record (DB)
        ↓
Send Notifications (Email + In-App)
        ↓
Meeting Expires (Session End + 30min)
```

## 🎯 Provider Comparison

| Provider | Best For | Cost | Setup |
|----------|----------|------|-------|
| **Jitsi** | Development/Testing | Free | ⚡ 1 min |
| **Daily.co** | Production | Paid | ⚡ 5 min |
| **Whereby** | Simplicity | Paid | ⚡ 5 min |
| **Zoom** | Enterprise | Freemium | ⏱️ 15 min |

## 🔒 Security Notes

- ✅ Meeting URLs only visible after confirmation
- ✅ Unique room per session (no reuse)
- ✅ Auto-expiry prevents unauthorized access
- ✅ Authenticated access only
- ✅ Admin-only manual intervention endpoint

## 📞 Support

- **Quick Setup Guide**: `docs/meeting-providers.md`
- **Full Documentation**: `MEETING_IMPLEMENTATION_SUMMARY.md`
- **API Docs**: `http://localhost:5000/api/v1/docs`

---

**Need Help?** Start with Jitsi for testing, then switch to Daily.co for production.
