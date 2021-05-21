### USER MANAGEMENT - USAGE

#### FIRST STEP - AUTHENTICATION
The API requires the following key in order to access endpoints:
282fba18-f680-4de8-a2fb-17f39c22d7da

If using the API viewer, click on Authorize button and enter the key.

#### ADD USER - Endpoint: POST /user
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
    "userName": "hydra_user",
    "pwdSha256": "f9d07093d0de736c8881640c3e55714bebd5faf5d6ebbfb41e486e1660c8fc0e",
    "firstName": "Will",
    "lastName": "Smith",
    "hxUid": "X-00001"
  }
  ```
4. Click on Execute
5. If successfully, 'Response body' should return (account may be different):
  ```json
  {
    "account": "0xD68Bbb97Af909F434c4488d7B11e3722A865b4D1",   // Whitelabeled account address allocated for the user
    "userName": "hydra_user",
    "hxUid": "X-00001"
  }
  ```

#### EDIT USER - Endpoint: PUT /user/{hxUid}
Request body schema:
__(Only include parameters that need to be updated)__

```json
{
  "userName": "string",
  "pwdSha256": "string",
  "firstName": "string",
  "lastName": "string",
}
```

How to test on the API viewer:
1. Click on end point (expand view)
2. Click on Try it out
3. Enter hxUid: X-00001
4. Enter transaction body. You may test with this data:
  
  ```json
  {
    "firstName": "William"
  }
  ```
4. Click on Execute
5. If successfully, 'Response body' should return:
  ```json
  {
    "hxUid": "X-00001",
    "userName": "hydra_user",
    "firstName": "William",
    "lastName": "Smith"
  }
  ```
