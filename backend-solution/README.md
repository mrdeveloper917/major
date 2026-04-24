# Smart Hostel Backend Delete Fix

This folder contains ready-to-copy backend code for the two broken delete flows:

- `DELETE /api/admin/delete-user/:id`
- `DELETE /api/complaints/:id`

It also includes:

- admin-only authorization middleware
- complaint status update controller
- uploads static folder snippet

## Files

- `middleware/auth.js`
- `controllers/admin.controller.js`
- `controllers/complaint.controller.js`
- `routes/admin.routes.js`
- `routes/complaint.routes.js`
- `server.static-snippet.js`

## How to use

### 1. Add middleware

Copy `middleware/auth.js` into your backend middleware folder.

### 2. Add controllers

Copy:

- `controllers/admin.controller.js`
- `controllers/complaint.controller.js`

into your backend controllers folder.

### 3. Add routes

Copy:

- `routes/admin.routes.js`
- `routes/complaint.routes.js`

into your backend routes folder.

### 4. Register routes in your server

Example:

```js
const adminRoutes = require("./routes/admin.routes");
const complaintRoutes = require("./routes/complaint.routes");

app.use("/api/admin", adminRoutes);
app.use("/api/complaints", complaintRoutes);
```

### 5. Serve uploads

Add this in your `server.js` or `app.js`:

```js
const path = require("path");

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
```

### 6. Restart backend

After copying files, restart the Node server.

## Expected API behavior

### Delete student

Request:

```http
DELETE /api/admin/delete-user/USER_ID
Authorization: Bearer <token>
```

Success response:

```json
{
  "success": true,
  "message": "Student removed successfully",
  "deletedUserId": "USER_ID"
}
```

### Delete complaint

Request:

```http
DELETE /api/complaints/COMPLAINT_ID
Authorization: Bearer <token>
```

Success response:

```json
{
  "success": true,
  "message": "Complaint deleted successfully",
  "deletedComplaintId": "COMPLAINT_ID"
}
```

### Update complaint status

Request:

```http
PUT /api/complaints/COMPLAINT_ID
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "status": "resolved"
}
```

Allowed values:

- `pending`
- `resolved`

## Important note

If your current backend uses different model names or file paths, keep the logic same and only adjust imports.
