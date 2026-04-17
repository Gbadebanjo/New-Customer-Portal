'use client';
import { useState, CSSProperties } from "react";
import { PulseLoader } from "react-spinners";



function ButtonLoader() {
  let [loading, setLoading] = useState(true);
  let [color, setColor] = useState("#fff");

  return (
    <div >
      <PulseLoader
        color={color}
        loading={loading}
        size={6}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
}

export default ButtonLoader;

// import React from 'react';
// import { Spinner } from '@/components/ui/spinner';

// const PageLoader = () => {
//     return (
//         <div className="relative h-[50vh] w-full flex flex-col justify-center items-center">
//             <div
//                 className="absolute top-[25%] left-[50%]"
//                 style={{ transform: 'translate(-50%)' }}
//             >
//                 <Spinner className="h-[150px] w-[150px] b-4 b-t-transparent" />
//             </div>
//         </div>
//     );
// };

// export default PageLoader;



// Spinner details
// import { cn } from '@/lib/utils';

// interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

// export function Spinner({ className, ...props }: SpinnerProps) {
//     return (
//         <div
//             className={cn(
//                 'animate-spin rounded-full border-2 border-current border-t-transparent',
//                 className
//             )}
//             {...props}
//         >
//             <span className="sr-only">Loading...</span>
//         </div>
//     );
// }
