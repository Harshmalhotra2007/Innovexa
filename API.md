# MeetIQ API Reference

Documentation of the newly introduced API endpoints in the MeetIQ Ops Console.

---

## 1. Delete Meeting
Cascadingly deletes a meeting, all of its segments, associated decisions, and tasks.

- **URL**: `/api/meetings/:id`
- **Method**: `DELETE`
- **Headers**:
  - `x-user-role`: `organizer` (Required. Requests with other values return a 403 Forbidden status).
- **Success Response**:
  - **Status Code**: `200 OK`
  - **Content**:
    ```json
    {
      "message": "Meeting deleted successfully"
    }
    ```
- **Error Response**:
  - **Status Code**: `403 Forbidden` (Role is not organizer)
  - **Content**:
    ```json
    {
      "error": "Forbidden: Requester must be an organizer"
    }
    ```
  - **Status Code**: `500 Internal Server Error`
  - **Content**:
    ```json
    {
      "error": "Failed to delete meeting"
    }
    ```

---

## 2. Assign Task
Assigns a user to an action item/task, updating its status, owner name, and owner email values.

- **URL**: `/api/tasks/:id/assign`
- **Method**: `PATCH`
- **Headers**:
  - `x-user-role`: `organizer` (Required. Requests with other values return a 403 Forbidden status).
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "assigneeId": "uuid-string-of-user" // or null to unassign
  }
  ```
- **Success Response**:
  - **Status Code**: `200 OK`
  - **Content**:
    ```json
    {
      "id": "task-uuid",
      "meetingId": "meeting-uuid",
      "title": "Configure Docker Containerization for Microservices",
      "description": "Write Dockerfile and docker-compose.yml",
      "ownerName": "Alex Mercer",
      "ownerEmail": "alex.mercer@company.org",
      "assigneeId": "user-uuid",
      "department": "Engineering",
      "priority": "Medium",
      "status": "Pending",
      "deadline": "2026-08-24T18:00:00.000Z",
      "escalationLevel": 0,
      "createdAt": "2026-08-23T13:00:00.000Z",
      "updatedAt": "2026-08-23T14:00:00.000Z"
    }
    ```
- **Error Response**:
  - **Status Code**: `403 Forbidden`
  - **Content**:
    ```json
    {
      "error": "Forbidden: Requester must be an organizer"
    }
    ```
  - **Status Code**: `404 Not Found` (User/assignee ID is invalid)
  - **Content**:
    ```json
    {
      "error": "User not found"
    }
    ```

---

## 3. Get All Users
Retrieves the list of all registered users to populate client-side assignee selectors.

- **URL**: `/api/users`
- **Method**: `GET`
- **Success Response**:
  - **Status Code**: `200 OK`
  - **Content**:
    ```json
    [
      {
        "id": "uuid-1",
        "name": "Alex Mercer",
        "email": "alex.mercer@company.org",
        "role": "Admin",
        "departmentId": "dept-uuid-1",
        "createdAt": "2026-08-23T13:00:00.000Z"
      },
      {
        "id": "uuid-2",
        "name": "Sarah Jenkins",
        "email": "sarah.j@company.org",
        "role": "Member",
        "departmentId": "dept-uuid-2",
        "createdAt": "2026-08-23T13:00:00.000Z"
      }
    ]
    ```
