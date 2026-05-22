# Smart Home Dashboard
*Version 4 of my smarthome dashboard*

This is being created to work on a raspberry pi, my current setup has a raspberry pi connected to a touchscreen screen.

## Getting Started
### Setting Up Google Acocunt For Testing

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) and create a new project.
2. In the navigation menu, go to **APIs & Services** → **Enable APIs & Services**.
3. Search for **Google Calendar API**, select it, and click **Enable**.
4. Go back to **APIs & Services** → **Credentials**.
5. Click **+ Create Credentials** → **OAuth Client ID**.
6. Set **Application Type** to **Web application** and give it a name.
7. Under **Authorised redirect URIs**, add `http://localhost:3000/api/auth/callback/google`.
8. Click **Create** and copy your **Client ID** and **Client Secret** into your `.env.local`:

```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
```

9. Go to **APIs & Services** → **OAuth consent screen**.
10. Under **Test users**, click **+ Add Users** and add your Google account email.



### Production
To run using the production server: `npm run prod`

When using WSL it wont automatically open the browser so simply open [http://localhost:3000](http://localhost:3000) to see the result.

### Development
To run using development server: `npm run dev`

When using WSL it wont automatically open the browser so simply open [http://localhost:3000](http://localhost:3000) to see the result.


## To Do
- Fix local player not getting song length
- Choose from mutiple ways to store music. - Wire it up
