"""Simple GUI calculator using Tkinter.

This module creates a calculator application with a graphical interface that
supports common arithmetic operations. Run the file directly to start the
application.
"""



import ast
import operator
import tkinter as tk
from tkinter import ttk
from typing import Callable, Dict, List


class Calculator(tk.Tk):
    """Tkinter based calculator window."""

    BUTTON_FONT = ("Segoe UI", 14)
    DISPLAY_FONT = ("Segoe UI", 24)

    def __init__(self) -> None:
        super().__init__()
        self.title("Taschenrechner")
        self.resizable(False, False)

        self.expression = tk.StringVar(value="")
        self._create_widgets()
        self._configure_grid()

    # ------------------------------------------------------------------
    # UI creation helpers
    # ------------------------------------------------------------------
    def _create_widgets(self) -> None:
        display = ttk.Entry(
            self,
            textvariable=self.expression,
            justify="right",
            font=self.DISPLAY_FONT,
        )
        display.grid(row=0, column=0, columnspan=4, sticky="nsew", padx=8, pady=(8, 4))

        buttons = [
            ("C", self.clear),
            ("(", lambda: self.add_character("(")),
            (")", lambda: self.add_character(")")),
            ("÷", lambda: self.add_operator("/")),
            ("7", lambda: self.add_character("7")),
            ("8", lambda: self.add_character("8")),
            ("9", lambda: self.add_character("9")),
            ("×", lambda: self.add_operator("*")),
            ("4", lambda: self.add_character("4")),
            ("5", lambda: self.add_character("5")),
            ("6", lambda: self.add_character("6")),
            ("−", lambda: self.add_operator("-")),
            ("1", lambda: self.add_character("1")),
            ("2", lambda: self.add_character("2")),
            ("3", lambda: self.add_character("3")),
            ("+", lambda: self.add_operator("+")),
            ("0", lambda: self.add_character("0")),
            ("±", self.toggle_sign),
            (".", lambda: self.add_decimal_point()),
            ("=", self.calculate),
        ]

        for index, (text, command) in enumerate(buttons, start=1):
            row = (index - 1) // 4 + 1
            column = (index - 1) % 4
            button = ttk.Button(self, text=text, command=command)
            button.configure(width=4)
            button.grid(row=row, column=column, sticky="nsew", padx=4, pady=4)
            button.configure(style="Calc.TButton")

        style = ttk.Style(self)
        style.configure("Calc.TButton", font=self.BUTTON_FONT)

    def _configure_grid(self) -> None:
        for column in range(4):
            self.columnconfigure(column, weight=1)
        # Display row
        self.rowconfigure(0, weight=1)
        # Button rows
        for row in range(1, 6):
            self.rowconfigure(row, weight=1)

    # ------------------------------------------------------------------
    # Event handlers
    # ------------------------------------------------------------------
    def add_character(self, char: str) -> None:
        self.expression.set(self.expression.get() + char)

    def add_operator(self, operator_char: str) -> None:
        current = self.expression.get()
        if current and current[-1] in "+-*/":
            self.expression.set(current[:-1] + operator_char)
        else:
            self.expression.set(current + operator_char)

    def add_decimal_point(self) -> None:
        current = self.expression.get()
        tokens = self._tokenize_for_decimal(current)
        if tokens and "." in tokens[-1]:
            return
        self.expression.set(current + ".")

    def toggle_sign(self) -> None:
        current = self.expression.get()
        if not current:
            return
        try:
            value = evaluate_expression(current)
        except Exception:
            return
        if value == 0:
            return
        new_value = str(-value)
        # Remove trailing .0 for integers
        if new_value.endswith(".0"):
            new_value = new_value[:-2]
        self.expression.set(new_value)

    def clear(self) -> None:
        self.expression.set("")

    def calculate(self) -> None:
        expr = self.expression.get()
        if not expr:
            return
        try:
            result = evaluate_expression(expr)
        except ZeroDivisionError:
            self.expression.set("Fehler: ÷0")
        except Exception:
            self.expression.set("Fehler")
        else:
            formatted = format_result(result)
            self.expression.set(formatted)

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------
    @staticmethod
    def _tokenize_for_decimal(expression: str) -> List[str]:
        token = ""
        tokens = []
        for char in expression:
            if char.isdigit() or char == ".":
                token += char
            else:
                if token:
                    tokens.append(token)
                    token = ""
        if token:
            tokens.append(token)
        return tokens


# ----------------------------------------------------------------------
# Expression evaluation helpers
# ----------------------------------------------------------------------

_ALLOWED_OPERATORS: Dict[type, Callable[[float, float], float]] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
}

_ALLOWED_UNARY_OPERATORS: Dict[type, Callable[[float], float]] = {
    ast.UAdd: lambda x: x,
    ast.USub: operator.neg,
}


def evaluate_expression(expression: str) -> float:
    """Safely evaluate a mathematical expression using AST parsing."""

    tree = ast.parse(expression, mode="eval")
    return _evaluate_ast(tree.body)


def _evaluate_ast(node: ast.AST) -> float:
    if isinstance(node, ast.BinOp):
        operator_type = type(node.op)
        if operator_type not in _ALLOWED_OPERATORS:
            raise ValueError(f"Operator {operator_type} not allowed")
        left = _evaluate_ast(node.left)
        right = _evaluate_ast(node.right)
        return _ALLOWED_OPERATORS[operator_type](left, right)
    if isinstance(node, ast.UnaryOp):
        operator_type = type(node.op)
        if operator_type not in _ALLOWED_UNARY_OPERATORS:
            raise ValueError(f"Operator {operator_type} not allowed")
        operand = _evaluate_ast(node.operand)
        return _ALLOWED_UNARY_OPERATORS[operator_type](operand)
    if isinstance(node, ast.Num):
        return float(node.n)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.Expression):
        return _evaluate_ast(node.body)
    raise ValueError(f"Unsupported expression: {node}")


def format_result(value: float) -> str:
    """Format the calculation result for display."""

    if value.is_integer():
        return str(int(value))
    return f"{value:.10g}"


def main() -> None:
    app = Calculator()
    app.mainloop()


if __name__ == "__main__":
    main()
