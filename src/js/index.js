import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import App from './container/App';
require('../../node_modules/material-design-lite/material.min.js');

const render = (Component) => {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('root')
  );
};

render(App);
