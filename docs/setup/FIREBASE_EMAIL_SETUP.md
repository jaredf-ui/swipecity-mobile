# Firebase Email Deliverability Setup

## 1. Custom Domain Authentication (Most Important)
Instead of sending from `noreply@swipecity-marketplace.firebaseapp.com`, use your own domain:
- Get a domain (e.g., swipecity.com)
- Set up Firebase to send from noreply@swipecity.com
- This dramatically improves deliverability

## 2. Firebase Console Settings
1. Go to Firebase Console > Authentication > Templates
2. Customize email templates:
   - Add your app name and logo
   - Use friendly sender name: "SwipeCity Support" instead of "noreply"
   - Add clear subject lines: "Reset your SwipeCity password"

## 3. DNS Records for Email Authentication
Add these to your domain's DNS to verify you're a legitimate sender:

### SPF Record
```
v=spf1 include:_spf.firebasemail.com ~all
```

### DKIM 
Firebase will provide DKIM records when you set up custom domain

### DMARC
```
v=DMARC1; p=none; rua=mailto:admin@swipecity.com
```

## 4. Use SendGrid Integration (Best Solution)
Firebase supports SendGrid for professional email delivery:

1. Sign up for SendGrid (free tier = 100 emails/day)
2. Get API key from SendGrid
3. Configure in Firebase Extensions:
   ```bash
   firebase ext:install sendgrid/sendgrid-email-sender
   ```
4. Emails will have 99%+ delivery rate

## 5. Quick Fixes for Testing
- Tell users to check spam folder initially
- Add instruction: "Check spam and mark as 'Not Spam'"
- Once users mark it as not spam, future emails arrive in inbox

## 6. In-App Instructions
Add this to your password reset screen:
```javascript
"Password reset email sent! Please check your inbox and spam folder. 
If in spam, mark it as 'Not Spam' to receive future emails properly."
```

## 7. For Production Launch
Priority order:
1. **Week 1**: Add in-app spam warning
2. **Week 2**: Set up custom domain
3. **Week 3**: Add SendGrid for professional delivery
4. **Month 2**: Monitor email metrics and adjust

## Common Spam Triggers to Avoid:
- ❌ "noreply" email addresses
- ❌ Firebase default domain
- ❌ No SPF/DKIM records
- ❌ Generic email content

## What Works:
- ✅ Custom domain (support@swipecity.com)
- ✅ SendGrid/Mailgun integration  
- ✅ Proper DNS authentication
- ✅ Personalized email templates