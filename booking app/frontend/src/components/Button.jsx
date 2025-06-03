import PropTypes from 'prop-types';

const Button = ({ children, variant = 'primary', size = 'medium', className = '', ...props }) => {
  const baseStyles = 'rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2';
  
  const sizeStyles = {
    small: 'py-1.5 px-3 text-sm',
    medium: 'py-2.5 px-4 text-base',
    large: 'py-3 px-5 text-lg'
  };
  
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-100 text-gray-800 bg-white'
  };
  
  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

export default Button;