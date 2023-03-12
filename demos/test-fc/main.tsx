import { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)

  // return <div onClick={() => setNum(n => n + 1)}>{num}</div>
  // return num === 3 ? <Child /> : <div>{num}</div>
  const arr =
    num % 2
      ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
      : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]

  return <ul onClickCapture={() => setNum(n => n + 1)}>{arr}</ul>
}

// function Child() {
//   return <span>big-react</span>
// }

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // @ts-ignore
  <App />,
)
