'use client';
import { useState } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import EyeIcon from "@/components/ui/icons/EyeIcon";
import EyeSlashIcon from "@/components/ui/icons/EyeSlashIcon";

export default function CustomTextField({
  label,
  value,
  onChange,
  isPassword = false,
  name
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <TextField
      fullWidth
      variant="filled"
      type={isPassword && !showPassword ? 'password' : 'text'}
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      margin="dense"
      InputProps={{
        endAdornment: isPassword && (
          <InputAdornment position="end">
            <IconButton onClick={handleTogglePassword} edge="start" sx={{
              color: '#fff',
              '&:hover': {
                backgroundColor: '#123751',
                color: '#fff',
              },
            }}>
              {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{
        // Keep the inner input transparent so the wrapper's colour is the
        // single source of truth — otherwise the wrapper's background flashes
        // to MUI's default filled-variant colour on focus while the input
        // stays #123751, producing a visible mismatch around the input and
        // eye-toggle button.
        input: {
          backgroundColor: 'transparent',
          color: '#E1E7ED',
          borderRadius: '10px',
          height: '34px',
          fontSize: '20px',
          '&::placeholder': { color: '#E1E7ED' },
          // Neutralise Chrome/Safari autofill's yellow/blue flash. The inset
          // shadow paints over the UA background; the fill-color keeps the
          // typed characters legible.
          '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active': {
            WebkitBoxShadow: '0 0 0 100px #123751 inset',
            WebkitTextFillColor: '#E1E7ED',
            caretColor: '#E1E7ED',
            borderRadius: 'inherit',
            transition: 'background-color 5000s ease-in-out 0s',
          },
        },
        label: {
          fontSize: '20px',
          color: '#E1E7ED',
          '&.Mui-focused': { color: '#ff7d70' },
        },
        '& .MuiFilledInput-root': {
          backgroundColor: '#123751',
          borderRadius: '10px',
          '&:hover': { backgroundColor: '#123751' },
          '&.Mui-focused': { backgroundColor: '#123751' },
          '&.Mui-focused:hover': { backgroundColor: '#123751' },
          '&.Mui-disabled': { backgroundColor: '#123751' },
          // Strip the filled-variant underline so no bar appears under the
          // input when idle or focused.
          '&:before, &:after, &:hover:before, &.Mui-focused:after': {
            borderBottom: 'none',
          },
        },
      }}
    />
  );
}
