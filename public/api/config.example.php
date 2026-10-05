<?php
// Copy this file to config.php on the server (same folder) and fill it in.
// config.php is never committed to GitHub and the deploy never overwrites it.
return [
    // Sends from an address on your own domain so emails aren't marked as spam.
    // Create it in SiteGround Site Tools > Email > Accounts.
    'from' => 'website@example.org.uk',
    'from_name' => 'Access:Hull website',

    // Who receives each form. To send a form to several people, list each address, e.g. ['a@x.org', 'b@x.org'].
    'forms' => [
        'contact'         => ['to' => ['hello@example.org.uk'],     'subject' => 'New message from the contact form'],
        'partner'         => ['to' => ['partners@example.org.uk'],  'subject' => 'New partner questionnaire'],
        'donate-a-device' => ['to' => ['donations@example.org.uk'], 'subject' => 'New device donation offer'],
    ],

    // Content editor (Decap CMS) sign-in. Create a GitHub OAuth app with the callback URL
    // https://YOUR-DOMAIN/api/auth.php and paste its details here.
    'github_client_id' => '',
    'github_client_secret' => '',
];
