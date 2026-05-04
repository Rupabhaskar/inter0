// "use client";
// import { useEffect, useState } from "react";

// export default function Timer({ duration }) {
//   const [time, setTime] = useState(duration);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTime((t) => t - 1);
//     }, 1000);

//     return () => clearInterval(interval);
//   }, []);

//   const minutes = Math.floor(time / 60);
//   const seconds = time % 60;

//   return (
//     <div className="font-bold text-red-600">
//       ⏱ {minutes}:{seconds.toString().padStart(2, "0")}
//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";

export default function Timer({ duration, onExpire }) {
  const [time, setTime] = useState(duration);

  useEffect(() => {
    if (time <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTime((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [time, onExpire]);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="font-semibold text-red-600">
      {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}
