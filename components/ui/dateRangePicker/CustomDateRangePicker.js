'use client'
import React, { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ButtonFlexible from "@/components/ui/button-flexible/ButtonFlexible";
import PlusIcon from "@/components/ui/icons/PlusIcon";

const datePickerStyles = `
.react-datepicker {
  background-color: #181c24 !important;
  color: #fff !important;
  border: 1px solid #23262a !important;
  z-index: 9999 !important;
  padding: 10px !important;
}
.react-datepicker__header {
  background-color: #23262a !important;
  border-bottom: 1px solid #23262a !important;
}
.react-datepicker__day,
.react-datepicker__day-name,
.react-datepicker__current-month {
  color: #fff !important;
}
.react-datepicker__day--selected,
.react-datepicker__day--in-selecting-range,
.react-datepicker__day--in-range {
  background-color: #ff7d70 !important;
  color: #fff !important;
}
`;

// Custom input to increase spacing between dates
const CustomInput = forwardRef(({ value, onClick, placeholder, minWidth }, ref) => {
    const [start, end] = value ? value.split(' – ') : ['', ''];
    return (
        <div
            onClick={onClick}
            ref={ref}
            style={{
                  display: 'flex',
                gap: '10px',
                alignItems: 'center',
                background: '#23262a',
                borderRadius: 6,
                padding: '15px 20px',
                border: '1px solid #23262a',
                color: '#fff',
                fontSize: '1.2rem',
                cursor: 'pointer',
                width: '100%',
            }}
        >
            <span>{start || placeholder}</span>
            <span>{end}</span>
        </div>
    );
});

CustomInput.displayName = "CustomInput";

const CustomDateRangePicker = ({ onChange, width }) => {
    const [dateRange, setDateRange] = useState([new Date(), new Date()]);
    const [startDate, endDate] = dateRange;

    const handleChange = (update) => {
        setDateRange(update);
        if (onChange) {
            onChange(update[0], update[1]);
        }
    };

    return (
        <>
            <style>{datePickerStyles}</style>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: width || 'auto',
                backgroundColor: '#23262a',
                borderRadius: 6,
            }}>
                <DatePicker
                    selectsRange
                    startDate={startDate}
                    endDate={endDate}
                    onChange={handleChange}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select date range"
                    popperClassName="custom-datepicker-popper"
                    monthsShown={2}
                    customInput={<CustomInput placeholder="Select date range"  />}
                    />
            </div>
        </>
    );
};

export default CustomDateRangePicker;