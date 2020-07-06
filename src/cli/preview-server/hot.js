(function run() {
  const Socket = window.SimpleWebsocket;
  const port = window.__OPENAPI_CLI_WS_PORT;

  let socket;

  reconnect();

  function reconnect() {
    socket = new Socket(`ws://127.0.0.1:${port}`);
    socket.on('connect', () => {
      socket.send('{"type": "ping"}');
    });

    socket.on('data', (data) => {
      const message = JSON.parse(data);
      switch (message.type) {
        case 'pong':
          console.log('[hot] hot reloading connected');
          break;
        case 'reload':
          console.log('[hot] full page reload');
          window.location.reload();
          break;
        default:
          console.log(`[hot] ${message.type} received`);
      }
    });

    socket.on('close', () => {
      socket.destroy();
      console.log('Connection lost, trying to reconnect in 4s');
      setTimeout(() => {
        reconnect();
      }, 4000);
    });

    socket.on('error', () => {
      socket.destroy();
    });
  }
})();
