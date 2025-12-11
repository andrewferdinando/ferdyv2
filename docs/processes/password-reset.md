# Password Reset Process

This document outlines the process for resetting a user's password in the Ferdy application. The process is designed to be secure and user-friendly, with a focus on preventing common security vulnerabilities.

## User Flow and API Interaction

The password reset process begins when a user clicks the "Forgot password?" link on the sign-in page. The user is then prompted to enter their email address. Upon submission, the frontend sends a `POST` request to the `/api/auth/reset-password` endpoint.

### Backend Logic

The backend receives the email address and uses the Supabase Admin client to generate a password reset link. This is done by calling the `auth.admin.generateLink()` method with the `type` set to `recovery`. The backend then sends a custom-branded email to the user's email address via Resend. To prevent email enumeration attacks, the API returns a generic success message regardless of whether the email address exists in the database.

### Password Update

When the user clicks the password reset link in the email, they are redirected to the `/auth/reset-password` page. This page includes a form where the user can enter and confirm their new password. Upon submission, the new password is sent to the Supabase Auth API to be updated.

## Technical Implementation and Security

The password reset process is implemented with a focus on security and a seamless user experience.

### Supabase Auth

Supabase Auth is used to handle the generation of secure, time-limited password reset links. The `auth.admin.generateLink()` method ensures that the links are unique and expire after a set period of time, reducing the risk of unauthorized access.

### Resend for Email Delivery

All password reset emails are sent using Resend, a third-party email delivery service. This allows for the use of custom-branded email templates and ensures reliable email delivery.

### Redirect Handling

To prevent redirect loops, the application is configured to not preserve the URL hash when redirecting from the `/auth/callback` page to the `/auth/reset-password` page. This ensures that the user is not caught in an infinite redirect loop after clicking the password reset link.

## Key Files and Code Snippets

-   **/src/app/api/auth/reset-password/route.ts**: The API endpoint that handles the password reset request.
-   **/src/app/auth/reset-password/page.tsx**: The page where the user can enter their new password.
-   **/src/app/auth/callback/page.tsx**: The page that handles the redirect from the password reset link.
