# Superflow Premium - Complete Setup Guide

## 🚀 Quick Setup for Replit AI Agent

Copy this exact instruction to the Replit AI agent when creating the new `superflow-premium` project:

---

**Build Superflow Premium - unlimited voice transcription app for app.superflow.work subdomain.**

**Project Requirements:**
- Unlimited voice recording (remove all time limits)
- Audio file upload with drag & drop (.mp3, .wav, .m4a, .ogg support, 100MB max)
- Enhanced transcription with speaker detection and timestamps
- Premium UI with gradient designs and advanced controls
- Cross-domain authentication with shared database
- Subscription management and usage analytics

**Technical Stack:**
- Express.js + React + TypeScript + Vite
- Neon PostgreSQL database (shared with main app)
- Cashfree payment integration for subscription management
- OpenAI Whisper + GPT-4 for enhanced transcription
- Tailwind CSS with premium design elements

**Key Features:**
1. Premium recording interface with unlimited duration
2. File upload component with validation and processing
3. Speaker detection and timestamp features
4. Enhanced transcription quality options (standard/high/premium)
5. Priority processing queue for premium users
6. Advanced analytics and usage tracking

**Authentication:**
- Cross-domain session sharing with superflow.work
- Automatic redirection based on user plan status
- Premium access control middleware

**The complete codebase will be provided - focus on premium feature implementation and unlimited capabilities.**

---

## 📁 Files to Copy to New Project

### Core Structure:
```
/client (copy entire directory)
/server (copy entire directory with premium modifications)
/shared (copy with premium schema)
package.json (use premium-package.json)
vite.config.ts (copy as-is)
drizzle.config.ts (copy as-is)
tailwind.config.ts (copy as-is)
components.json (copy as-is)
postcss.config.js (copy as-is)
tsconfig.json (copy as-is)
```

### Premium-Specific File Replacements:
```
shared/schema.ts → Use premium-shared-schema.ts
server/auth.ts → Use premium-auth.ts
server/routes.ts → Use premium-routes.ts
server/storage.ts → Use premium-storage.ts
client/src/pages/dashboard.tsx → Use premium-dashboard.tsx
client/src/components/recording-interface.tsx → Use premium-recording-interface.tsx
package.json → Use premium-package.json
```

## 🔧 Environment Variables for Premium App

Set these in the new Replit project secrets:

```bash
# Database (same as main app)
DATABASE_URL=your_neon_database_url

# OpenAI (same as main app)
OPENAI_API_KEY=your_openai_key

# Cashfree (same as main app)
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_ENVIRONMENT=sandbox

# Premium App Configuration
VITE_APP_DOMAIN=app.superflow.work
VITE_MAIN_DOMAIN=superflow.work
SESSION_SECRET=generate_new_secret_for_premium_app

# Google Analytics (optional)
VITE_GA_MEASUREMENT_ID=your_ga_id
```

## 🗄️ Database Schema Updates

The premium app uses the same database with enhanced tables. Run these commands in the new project:

```bash
npm run db:push --force
```

This will add the premium tables:
- `premium_features` - Track premium feature usage
- `audio_files` - Manage uploaded audio files
- Enhanced `recordings` table with premium metadata

## 🔗 Cross-Domain Authentication Flow

1. **User logs in on superflow.work**
2. **Check user plan_type in database**
3. **If premium plan** → Redirect to app.superflow.work
4. **Shared session cookies** enable seamless auth
5. **Premium app validates** user has active subscription

## 🎯 Premium Features Implementation

### 1. Unlimited Recording
- Remove all time constraints from recording interface
- Display unlimited timer instead of countdown
- Enhanced audio quality settings

### 2. File Upload System
- Drag & drop interface for audio files
- Support: .mp3, .wav, .m4a, .ogg (up to 100MB)
- File validation and processing queue
- Upload progress indicators

### 3. Enhanced Transcription
- Speaker detection and identification
- Timestamp generation for segments
- Quality options: standard/high/premium
- Priority processing queue

### 4. Premium UI Components
- Gradient backgrounds and premium badges
- Advanced control panels
- Enhanced results display
- Professional design elements

## 🧪 Testing Checklist

After deployment, test these flows:

### Authentication Flow:
- [ ] Access app.superflow.work without login → Redirect to main app
- [ ] Login with free user → Stay on main app
- [ ] Login with premium user → Access premium features
- [ ] Session persistence across domains

### Premium Features:
- [ ] Unlimited recording (no time limits)
- [ ] File upload functionality
- [ ] Speaker detection toggle
- [ ] Enhanced transcription quality
- [ ] Priority processing

### Payment Integration:
- [ ] Subscription status display
- [ ] Feature access control
- [ ] Plan expiry handling
- [ ] Upgrade/downgrade flows

## 🔒 Security Considerations

### Cross-Domain Safety:
- Secure cookie configuration
- CORS headers for subdomain access
- Session validation on each request
- Premium access verification

### Data Protection:
- Same DPDP Act 2023 compliance
- India region data localization
- Encrypted data transmission
- Audit logging for premium features

## 🚀 Deployment Steps

1. **Create new Replit project** named `superflow-premium`
2. **Copy all files** from the provided bundle
3. **Set environment variables** (listed above)
4. **Run database migration** with `npm run db:push --force`
5. **Test authentication** and premium features
6. **Configure subdomain** DNS settings
7. **Deploy to production** on app.superflow.work

## 🔄 Main App Integration

The main app (superflow.work) already has:
- Payment success page that redirects to app.superflow.work
- User plan validation and routing logic
- Cashfree integration for premium subscriptions

## 📞 Support & Maintenance

- Monitor premium feature usage via analytics
- Track subscription renewals and expirations
- Handle premium user support requests
- Maintain feature parity between plans

---

**Ready for deployment!** All premium features are architected for scalability and professional use.