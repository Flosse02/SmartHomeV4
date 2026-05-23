# Smart Home Dashboard
*Version 4 of my smarthome dashboard*

This is being created to work on a raspberry pi, my current setup has a raspberry pi connected to a touchscreen screen.

## Current Features
- Split Screen made in a 9:16 ratio.
- Top Infomation Screen
    - Weather - Temprature, wind and weathercodes (shown as icons like ☁️ and ☀️)
    - Time and date.
    - Smart area tabs to control what is shown in top half of screen.
- Bottom half
    - Interactive calander linked to a google account.
    - Shows all you google calander events.
    - Allows the adding, editing and deleting of events.
- Top half
    - Pictures Tab - Shows slideshow of your pictures that are stored in the public/photos/ folder. Control the location and timeing of the slideshow in the .env folder.
    - Music Tab - For playing music, links to jellyfin server or a folder you decide to play music. Can then play this music on your device or a castable device that has been setup using Home Assistant.
    - Home Tab - Used to display and control your devices connected to your Home Assistant.
    - Notes Tab - Allows you to store and write notes, was initially meant to be intergrated with google keep but that is reserved for "Buisness Customers" only :(
    - Camera Tab - Intergrates with your cameras connected to Home Assistant and plays them for you to see. (Cannot verify as I do not have any)


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