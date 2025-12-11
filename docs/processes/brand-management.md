# Brand Management Process

This document outlines the processes for adding and deleting brands in the Ferdy application. These processes are designed to be secure and to ensure data integrity.

## Adding a Brand

The process of adding a new brand begins on the `/account/add-brand` page. An authenticated user with the appropriate permissions can fill out a form to create a new brand.

### User Input

The user is prompted to provide the following information:

-   **Name**: The name of the new brand.
-   **Website URL**: The URL of the brand's website.
-   **Country Code**: The two-letter country code for the brand's location.

### Backend Logic

Upon form submission, the backend performs the following actions:

1.  **Insert into `brands`**: A new row is inserted into the `brands` table with the provided information. The `timezone` is set to a default value, and other fields are left to their default or `NULL` values.
2.  **Insert into `brand_memberships`**: The currently authenticated user is associated with the new brand by inserting a new row into the `brand_memberships` table. The user's role is set to a default value, which can be updated later.
3.  **Insert into `brand_post_information`**: A new row is inserted into the `brand_post_information` table to store brand-level posting defaults and analysis metadata. This row is used by the copy and image generation engine to provide brand-level defaults for copy length, posting time, and tone of voice.

After these database operations are complete, the user is redirected to the brand's context, such as the brand dashboard or categories page.

## Deleting a Brand

The process of deleting a brand is initiated from the billing page. An admin user can remove a brand, which triggers a soft-delete process.

### Backend Logic

When an admin removes a brand, the backend performs the following actions:

1.  **Soft-delete Brand**: The brand is soft-deleted in the database by setting a `deleted_at` timestamp. This ensures that the brand's data is not permanently lost and can be restored if needed.
2.  **Update Stripe Subscription**: The Stripe subscription is updated to reflect the removal of the brand. This may involve reducing the quantity of the subscription or canceling it altogether.
3.  **Send Email Notification**: An email notification is sent to the user to confirm that the brand has been deleted and to provide information about the changes to their subscription.

## Security Considerations

-   **Row-Level Security (RLS)**: RLS policies are in place to ensure that users can only access and manage brands that they are members of. The policies for the `brands`, `brand_memberships`, and `brand_post_information` tables are configured to restrict access based on the user's `auth.uid()`.
-   **Permissions**: Only users with the appropriate permissions can add or delete brands. The application checks the user's role and permissions before allowing them to perform these actions.
