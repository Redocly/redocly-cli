import { UserContext } from '../../walk'

export const TestDecorator: any = () => {
  return {
    Operation: {
      enter(operation: UserContext) {
        console.log('enter__Operation::', operation);
      },
      leave(operation: UserContext) {
        console.log('leave__Operation::', operation);
      }
    }
  }
};
