# A Sample Application

- Some tests may be slow if the SMTP service is active (totally intentional)

## How To Run Migrations and Seeds

`npm install`
If you want to test it into production enviroment you can run the test command that will migrate, seed and run the tests:
`npm run test:staging`
If you may test in :memory: just run:
`npm run test`
If you want the tests to be quick set the SMTP service to false in the .env file.

## How To Test Using Postman

Make sure to import the postman_export.json file into Postman.

1. `npm start`
2. `create the user into Postman`
3. activate the user with the link you'll recieve on the console
4. login with the user
5. test the other routes if you want

that's pretty much it.
