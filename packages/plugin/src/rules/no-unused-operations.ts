import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from 'graphql';
import { GraphQLESTreeNode } from '../estree-converter/index.js';
import { GraphQLESLintRule } from '../types.js';
import { logger } from '../utils.js';

const RULE_ID = 'no-unused-operations';

interface GraphQLOperation {
  name: string;
  type: string;
  node: any;
  used: boolean;
}

export const rule: GraphQLESLintRule = {
  meta: {
    type: 'suggestion',
    hasSuggestions: false,
    docs: {
      category: 'Operations',
      description: 'Detect unused GraphQL operations.',
      url: `https://the-guild.dev/graphql/eslint/rules/${RULE_ID}`,
      examples: [
        {
          title: 'Incorrect',
          code: /* GraphQL */ `
            # This GraphQL operation is defined but not used in the code.
            query GetUser {
              user {
                id
                name
              }
            }
          `,
        },
        {
          title: 'Correct',
          code: /* GraphQL & JavaScript */ `
            # This GraphQL operation is defined.
            query GetUser {
                user {
                    id
                    name
                }
            }

            # Somewhere in the code, the operation is used.
            const { data, loading } = useGetUser();
          `,
        },
      ],
    },
    messages: {
      [RULE_ID]: "In file '{{filename}}', the GraphQL {{type}} operation '{{name}}' is unused.",
    },
    schema: [],
  },
  create(context) {
    const graphqlOperations: GraphQLOperation[] = [];

    function extractOperationNames(document: any): { name: string; type: string }[] {
      const operations: { name: string; type: string }[] = [];
      for (const definition of document.definitions) {
        if (definition.kind === 'OperationDefinition' && definition.name) {
          const operationTypeSuffix =
            definition.operation.charAt(0).toUpperCase() + definition.operation.slice(1);
          const hookName = `use${definition.name.value}${operationTypeSuffix}`;
          operations.push({
            name: hookName,
            type: definition.operation,
          });
        }
      }
      return operations;
    }

    return {
      ImportDeclaration(node: GraphQLESTreeNode<any>) {
        if (/\.(graphql|gql)$/.test(node.source.value)) {
          const filepath = path.join(path.dirname(context.filename), node.source.value);
          try {
            const content = fs.readFileSync(filepath, 'utf-8');
            const parsed = parse(content);
            const operations = extractOperationNames(parsed);
            for (const operation of operations) {
              graphqlOperations.push({
                ...operation,
                node,
                used: false,
              });
            }
          } catch (err) {
            logger.error(
              `The rule "${RULE_ID}" encountered an issue while processing the file at "${filepath}". Ensure all GraphQL operation files are correctly formatted and accessible.`,
            );
          }
        }
      },
      Identifier(node: GraphQLESTreeNode<any>) {
        const operationObj = graphqlOperations.find(op => op.name === node.name);
        if (operationObj) {
          operationObj.used = true;
        }
      },
      'Program:exit'() {
        for (const operationObj of graphqlOperations) {
          if (!operationObj.used) {
            context.report({
              node: operationObj.node,
              messageId: RULE_ID,
              data: {
                name: operationObj.name
                  .replace(/^use/, '')
                  .replace(/(Query|Mutation|Subscription)$/, ''),
                type: operationObj.type,
                filename: context.filename,
              },
            });
          }
        }
      },
    };
  },
};
