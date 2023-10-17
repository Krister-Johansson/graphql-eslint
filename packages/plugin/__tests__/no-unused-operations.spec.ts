import { join } from 'node:path';
import { rule } from '../src/rules/no-unused-operations';
import { ruleTester } from './test-utils';

// Assuming you have a mock GraphQL file named `user.graphql` with the operation definition
ruleTester.run('no-unused-operations', rule, {
  valid: [
    {
      name: 'should detect used GraphQL operations',
      filename: join(__dirname, 'mocks/user.js'), // Provide a virtual path for the JS file
      code: /* JavaScript */ `
        const { data, loading } = useGetUserQuery();
      `,
      parserOptions: {
        graphQLConfig: {
          documents: ruleTester.fromMockFile('no-unused-operations.gql'), // Mock the GraphQL operation
        },
      },
    },
    // ... (other valid test cases)
  ],
  invalid: [
    {
      name: 'should detect unused GraphQL operations',
      filename: join(__dirname, 'mocks/unused-user.js'),
      code: /* JavaScript */ `
      `,
      parserOptions: {
        graphQLConfig: {
          documents: ruleTester.fromMockFile('no-unused-operations.gql'),
        },
      },
      errors: [
        {
          message: "In file 'unusedUser.graphql', the GraphQL query operation 'GetUser' is unused.",
        },
      ],
    },
    // ... (other invalid test cases)
  ],
});
