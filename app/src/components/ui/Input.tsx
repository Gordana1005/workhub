'use client'

/**
 * Form fields: Input, Textarea, Select, Field, inputClasses
 *   <Field label="Name" hint? error? required? optionalLabel?>
 *     <Input value onChange />            // Field injects id + aria-describedby + aria-invalid
 *   </Field>
 *   <Input invalid leftIcon? />  <Textarea rows />  <Select><option/></Select>
 * `inputClasses({ invalid, size })` styles any element the same way (e.g. a custom control).
 * Phone: 44px tall and 16px text (prevents iOS zoom); sm+: 40px / 14px. size="sm" = 36px on sm+.
 */
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface InputStyleOptions {
  invalid?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const fieldBase =
  'block w-full rounded-lg border bg-secondary text-base text-text-primary shadow-xs transition-[border-color,box-shadow] duration-150 sm:text-sm ' +
  'placeholder:text-text-muted focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:opacity-60 read-only:bg-surface-hover/60'

export function inputClasses({ invalid = false, size = 'md', className }: InputStyleOptions = {}) {
  return twMerge(
    clsx(
      fieldBase,
      size === 'sm' ? 'h-11 px-3 sm:h-9' : 'h-11 px-3 sm:h-10',
      invalid
        ? 'border-danger focus:border-danger focus:ring-danger/25'
        : 'border-border-control focus:border-primary focus:ring-primary/25',
      className
    )
  )
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean
  size?: 'sm' | 'md'
  leftIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, size = 'md', leftIcon, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        className={inputClasses({ invalid, size, className: clsx(leftIcon && 'pl-9', className) })}
        {...props}
      />
    )
    if (!leftIcon) return input
    return (
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted [&>svg]:h-4 [&>svg]:w-4"
        >
          {leftIcon}
        </span>
        {input}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, 'aria-invalid': ariaInvalid, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      className={inputClasses({ invalid, className: clsx('h-auto min-h-[5rem] resize-y py-2.5 leading-6 sm:py-2', className) })}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  invalid?: boolean
  size?: 'sm' | 'md'
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, invalid, size = 'md', children, 'aria-invalid': ariaInvalid, ...props }, ref) => (
    <div className={clsx('relative', wrapperClassName)}>
      <select
        ref={ref}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        className={inputClasses({ invalid, size, className: clsx('appearance-none pr-9', className) })}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      />
    </div>
  )
)
Select.displayName = 'Select'

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  /** Show the localized "Optional" tag next to the label */
  optional?: boolean
  className?: string
  children: ReactNode
}) {
  const t = useTranslations('common')
  const uid = useId()
  const hintId = `${uid}-hint`
  const errorId = `${uid}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  let control = children
  let controlId = uid
  if (isValidElement(children)) {
    const el = children as ReactElement<Record<string, unknown>>
    controlId = (el.props.id as string | undefined) ?? uid
    control = cloneElement(el, {
      id: controlId,
      'aria-describedby': (el.props['aria-describedby'] as string | undefined) ?? describedBy,
      ...(error ? { 'aria-invalid': true, ...(typeof el.type === 'string' ? {} : { invalid: true }) } : {}),
      ...(required ? { required: true } : {}),
    })
  }

  return (
    <div className={clsx('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={controlId} className="flex items-baseline gap-1.5 text-sm font-medium text-text-primary">
          <span>{label}</span>
          {required ? (
            <span aria-hidden className="text-danger">
              *
            </span>
          ) : null}
          {optional && !required ? <span className="text-xs font-normal text-text-muted">{t('optional')}</span> : null}
        </label>
      ) : null}
      {control}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
