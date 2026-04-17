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
        input: {
          backgroundColor: '#123751',
          color: '#E1E7ED',
          borderRadius: '10px',
          height: '34px',
          fontSize: '20px',
          '&::placeholder': {
            color: '#E1E7ED',
          },
        },
        label: {
          fontSize: '20px',
          color: '#E1E7ED',
          '&.Mui-focused': {
            color: '#ff7d70',
          },
        },
        '& .MuiFilledInput-root': {
          backgroundColor: '#123751',
          borderRadius: '10px',
          '&:hover': {
            backgroundColor: '#123751',
          },
        },
      }}
    />
  );
}
