### USER MANAGAMENT - USAGE

#### FIRST STEP - AUTHENTICATION
The API requires the following key in order to access endpoints:
282fba18-f680-4de8-a2fb-17f39c22d7da

If using the API viewer, click on Authorize button and enter the key.

#### ADD USER - Endpoint: /user/addUser
Request body schema:
```json
{
  "userName": "string",
  "pwdSha256": "string",
  "firstName": "string",
  "lastName": "string",
  "hxUid": "string"
}
```

How to test on the API viewer:
1. Click on end point (expand view)
2. Click on Try it out
3. Enter transaction body. You may test with this data:
  ```json
  {
    "userName": "hx_user",
    "pwdSha256": "f9d07093d0de736c8881640c3e55714bebd5faf5d6ebbfb41e486e1660c8fc0e",
    "firstName": "Will",
    "lastName": "Smith",
    "hxUid": "00001"
  }
  ```
4. Click on Execute
5. If successfull, 'Response body' should return transaction hash.

#### EDIT USER - Endpoint: /user/editUser
Request body schema:
__Only include parameters that need to be updated__

```json
{
  "hxUid": "string",   // required
  "userName": "string",
  "pwdSha256": "string",
  "firstName": "string",
  "lastName": "string",
  "newHXUid": "string"
}
```

How to test on the API viewer:
1. Click on end point (expand view)
2. Click on Try it out
3. Enter transaction body. You may test with this data:
  ```json
  {
    "hxUid": "00001",
    "userName": "hx_william",
    "firstName": "William"
  }
  ```
4. Click on Execute
5. If successfull, 'Response body' should return transaction hash.
