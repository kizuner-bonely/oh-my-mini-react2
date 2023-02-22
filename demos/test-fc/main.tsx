import { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)

  return <div>{num}</div>
  // return (
  //   <div>
  //     <Child />
  //   </div>
  // )
}

// function Child() {
//   return <span>big-react</span>
// }

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // @ts-ignore
  <App />,
)
