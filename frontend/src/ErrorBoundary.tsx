import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{children: ReactNode},{hasError:boolean; msg?:string}> {
  state = { hasError: false, msg: "" };
  static getDerivedStateFromError(err: unknown) { return { hasError: true, msg: String(err) }; }
  componentDidCatch(err: unknown) { console.error(err); }
  render() {
    if (this.state.hasError) return <div style={{padding:16}}><h2>Something broke on this page.</h2><pre>{this.state.msg}</pre></div>;
    return this.props.children;
  }
}
