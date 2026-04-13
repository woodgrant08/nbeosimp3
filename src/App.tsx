import { Switch, Route } from "wouter"


import Home from "./pages/home"
import Simulation from "./pages/simulation"
import Results from "./pages/results"
import Metrics from "./pages/metrics"

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/case/:id" component={Simulation} />
      <Route path="/results/:id" component={Results} />
      <Route path="/metrics" component={Metrics} />
    </Switch>
  )
}
