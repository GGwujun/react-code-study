import { Component } from "react";
export default class TestComponent extends Component {
  state = {
    name: 100,
  };

  setName = () => {
    debugger;
    this.setState({
      name: this.state.name + 1,
    });
  };

  render() {
    const { name } = this.state;
    return (
      <div className="classComponentBox" onClick={() => this.setName()}>
        this test Class Component
        <p>current state name:</p>
        {name}
      </div>
    );
  }
}
