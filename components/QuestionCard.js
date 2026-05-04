// export default function QuestionCard({ question, selected, onSelect }) {
//   return (
//     <div>
//       <h3 className="font-semibold mb-4">
//         {question.question}
//       </h3>

//       <div className="space-y-2">
//         {question.options.map((opt, index) => (
//           <label
//             key={index}
//             className={`block p-3 border rounded cursor-pointer ${
//               selected === index
//                 ? "bg-blue-100 border-blue-500"
//                 : ""
//             }`}
//           >
//             <input
//               type="radio"
//               className="mr-2"
//               checked={selected === index}
//               onChange={() => onSelect(index)}
//             />
//             {opt}
//           </label>
//         ))}
//       </div>
//     </div>
//   );
// }

export default function QuestionCard({ question, selected, onSelect }) {
  return (
    <div>
      <p className="font-medium mb-4">
        {question.id}. {question.question}
      </p>

      <div className="space-y-2">
        {question.options.map((opt, index) => (
          <label
            key={index}
            className={`flex items-center gap-2 p-2 border rounded cursor-pointer
              ${selected === index ? "bg-blue-50 border-blue-500" : ""}`}
          >
            <input
              type="radio"
              checked={selected === index}
              onChange={() => onSelect(index)}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
