import { Component } from 'react';
import { DraftInputTypeAhead } from '../components/DraftInputTypeAhead';

import '../../styles/base.scss';

export default class Sample extends Component {
  constructor() {
    super();
    this.state = {
      inputVal: ''
    }
  }
  render() {
    return (
      <div className="container">
        <h1>Draft Input Dropdown</h1>
        <DraftInputTypeAhead
          suggestions={['one', 'onefor', 'onethousand', 'onemany', 'onebabana', 'two', 'o', 'onawe', 'one thousand', 'omore sh', 'omore matches', 'omore more', 'omashso', 'oadasdasdas', 'oo', 'ooo', 'oooo', 'oooooo', 'ooooooooo', 'ooooooooooo']}
        />
        <h1>An input field</h1>
        <input
          onChange={(e) => {
            this.setState({
              inputVal: e.target.value
            });
          }}
          value={this.state.inputVal}
          type="text"
        />
      </div>
    );
  }
}
