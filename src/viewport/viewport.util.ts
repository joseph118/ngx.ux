import { Dictionary } from "../internal/internal.model";
import {
	ComparisonOperation,
	ViewportSizeMatcherExpression,
	ViewportSizeTypeInfo,
	ViewportMatchConditions
} from "./viewport.model";

export function isViewportSizeMatcherExpression(value: unknown): value is ViewportSizeMatcherExpression {
	if (typeof value !== "object" || !value) {
		return false;
	}
	const args: Partial<ViewportSizeMatcherExpression> = value;
	if (args.size && args.operation) {
		return true;
	}
	return false;
}

export function isViewportSizeMatcherTupleExpression(arg: unknown): arg is [ComparisonOperation, string] {
	if (!arg) {
		return false;
	}
	if (Array.isArray(arg)) {
		if (arg.length === 2) {
			const [op] = arg;
			return operations.includes(op);
		}
	}
	return false;
}


const operations = Object.values(ComparisonOperation);

export const COMPARISON_OPERATION_FUNC_MAPPING: Dictionary<(a: number, b: number) => boolean> = {
	[ComparisonOperation.equals]: (a: number, b: number) => a === b,
	[ComparisonOperation.notEquals]: (a: number, b: number) => a !== b,
	[ComparisonOperation.lessThan]: (a: number, b: number) => a < b,
	[ComparisonOperation.lessOrEqualThan]: (a: number, b: number) => a <= b,
	[ComparisonOperation.greaterThan]: (a: number, b: number) => a > b,
	[ComparisonOperation.greaterOrEqualThan]: (a: number, b: number) => a >= b,
};

export function isViewportConditionMatch(
		evaluteSize: ViewportSizeTypeInfo,
		conditions: ViewportMatchConditions,
		viewportSizeTypeInfoRefs: Dictionary<ViewportSizeTypeInfo>) {
	const isExcluded = match(conditions.sizeTypeExclude, evaluteSize.name, false);
	let isIncluded;
	let isExpressionTruthy;

	if (!isExcluded && conditions.expresson) {
		const expressionSizeTypeValue: number = viewportSizeTypeInfoRefs[conditions.expresson.size].type;
		const expMatcher = COMPARISON_OPERATION_FUNC_MAPPING[conditions.expresson.operation];

		isExpressionTruthy = expMatcher(evaluteSize.type, expressionSizeTypeValue);
	} else {
		isIncluded = match(conditions.sizeType, evaluteSize.name, true);
	}

	const shouldRender = (isExpressionTruthy || isIncluded) && !isExcluded;
	// console.warn(">>> shouldRender", { evaluteSize, conditions, shouldRender });
	return !!shouldRender;
}

function match(value: string | string[] | null | undefined, targetValue: string, defaultValue: boolean) {
	if (!value) {
		return defaultValue;
	}

	return Array.isArray(value)
		? value.includes(targetValue)
		: value === targetValue;
}

/**
 * Converts the breakpoints into a 2 dimensional array containing the name and width, and sorted from
 *  smallest to largets.
 * @param breakpoints the breakpoints obtained from the config
 * @internal
 */
function getSortedBreakpoints(breakpoints: Dictionary<number>): [string, number][] {
	return Object.entries(breakpoints)
		.sort(([, widthA], [, widthB]) => widthA - widthB);
}

/**
 * A util function which generates the ViewportSizeTypeInfo.type for each breakpoint.
 * @param breakpoints the custom breakpoints
 */
export function generateViewportSizeType<T extends Record<string, number>>(breakpoints: T): T & Record<number, string> {
	return getSortedBreakpoints(breakpoints)
		.reduce((dictionary, [name, _width], index) => (
			{
				...dictionary,
				[name]: index,
				[index]: name,
			}
		), {}) as T & Record<number, string> ;
}

/**
 * Pre-processes the given breakpoints into an ordered list from smallest to largest while generating
 *  all the necessary information on the viewport.
 * @param breakpoints the breakpoints obtained from the config
 * @internal
 */
export function generateViewportSizeTypeInfoList(breakpoints: Dictionary<number>): ViewportSizeTypeInfo[] {
	return getSortedBreakpoints(breakpoints)
		.map(([name, width], index) => (Object.freeze({
			name,
			type: index,
			widthThreshold: width
		}))
	);
}

/**
 * Converts the breakpoint list into a dictionary while using the name as key.
 * @param breakpointList the list of breakpoints
 * @internal
 */
export function generateViewportSizeTypeInfoRefs(breakpointList: ViewportSizeTypeInfo[]): Dictionary<ViewportSizeTypeInfo> {
	return Object.freeze(
		breakpointList.reduce<Dictionary<ViewportSizeTypeInfo>>((dictionary, breakpoint) => (
			{
				...dictionary,
				[breakpoint.name]: breakpoint
			}
		), {})
	);
}
