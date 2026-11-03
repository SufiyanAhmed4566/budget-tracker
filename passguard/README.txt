PASSGUARD — Password Expiry & User Management System
====================================================

Technology:
- HTML5
- CSS3
- JavaScript
- Browser LocalStorage

Pages:
1. index.html              Login + Registration
2. dashboard.html          User Dashboard + Password Status + Notifications
3. change-password.html    Password Change
4. admin.html              Admin Dashboard + User Management + Password Policy

How to run (recommended):
1. Extract the ZIP.
2. Open the passguard folder in VS Code.
3. Run index.html with the "Live Server" extension.
4. Register a user, then log in.
5. Use the admin account to manage users.

Why Live Server?
LocalStorage is most reliable when all pages run from the same localhost origin.
The project still contains only HTML, CSS and JavaScript application code.

Admin demo login:
Username: admin
Password: Admin@123

Default password policy:
- Validity: 30 days
- Warning: 5 days before expiry

Features:
- User registration and login
- Password hashing before LocalStorage persistence
- Password creation and expiry dates
- Automatic days-remaining calculation
- Expiry warnings
- Forced password change after expiry
- Password strength checks
- User dashboard
- Admin statistics
- Search/filter users
- Activate/deactivate users
- Delete users
- Instantly expire a user's password for project demonstration
- Configurable password validity policy
- Responsive interface

Important:
This is a browser-only academic/demo project. LocalStorage is not a secure
replacement for a server-side database and authentication system in a real
production application.