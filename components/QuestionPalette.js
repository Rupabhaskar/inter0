// export default function QuestionPalette({ questions, current, answers, setCurrent }) {
//   return (
//     <div className="grid grid-cols-5 gap-2">
//       {questions.map((_, i) => (
//         <button
//           key={i}
//           onClick={() => setCurrent(i)}
//           className={`p-2 rounded text-sm font-semibold ${
//             answers[i] !== undefined
//               ? "bg-green-500 text-white"
//               : i === current
//               ? "bg-blue-500 text-white"
//               : "bg-slate-200"
//           }`}
//         >
//           {i + 1}
//         </button>
//       ))}
//     </div>
//   );
// }


export default function QuestionPalette({
  questions,
  current,
  answers,
  setCurrent,
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {questions.map((_, i) => (
        <button
          key={i}
          onClick={() => setCurrent(i)}
          className={`w-10 h-10 text-sm rounded border
            ${current === i ? "bg-blue-600 text-white" : ""}
            ${answers[i] !== undefined ? "bg-green-100" : ""}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
