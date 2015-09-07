var fixpoint = function()
{
	/**
	 * @constant which contains the default options for the fixed point iteration algorithm, @see #iterate.
	 */
	var defaultOptions = 
	{
		maxError : 1e-7,
		maxSteps : 1000,
		checkCycles : true,
		convergenceTest : mixedErrorTest
	};

	/** @constant minimum normalized double precision floating point number */
	Number.MIN_NORMAL = Math.pow(2, -1022);

	/** @constant minimum possible relative error between two floating point numbers */
	if (Number.MACHINE_EPSILON === undefined)
	{
		Number.MACHINE_EPSILON = 1.0;

		while ((1.0 + (Number.MACHINE_EPSILON / 2.0)) > 1.0)
		{
			Number.MACHINE_EPSILON /= 2.0;
		}
	}

	if (Number.isFinite === undefined)
	{
		/** A simple polyfill for isFinite method. */
		Number.isFinite = function(value) 
		{
			if (typeof value !== 'number')
				return false;
			if (value === Number.POSITIVE_INFINITY)
				return false;
			if (value === Number.NEGATIVE_INFINITY)
				return false;
			return true;
		}
	}

	/**
	 * Performs a simple absolute error test for two values.
	 * @param {Number} maxError specifies the maximum absolute error to be accepted.
	 * @param {Number} a first value.
	 * @param {Number} b second value.
	 * @return {Boolean} true, if the absolute error is smaller than the specified maxError.
	 */
	function absoluteErrorTest(maxError, a, b)
	{
		return Math.abs(a - b) <= maxError;
	}

	/**
	 * Performs a mixed error test (convergence test), using last 3 values from a sequence.
	 * @param {Number} maxError specifies the maximum error to be accepted.
	 * @param {Number} x last value of the sequence. 
	 * @param {Number} xprev1 previous-last value of the sequence.
	 * @param {Number} xprev1 preious-previous-last value of the sequence.
	 * @return {Boolean} true, if the estimated absolute error is smaller than the specified maxError.
	 */
	function mixedErrorTest(maxError, x, xprev1, xprev2)
	{
		if (x === xprev1) return true;
		// compute an estimate of the absolute error
		var err = Math.abs(x - xprev1) + Math.abs(xprev1 - xprev2);
		// use a mixed error test for absolute and relative error
		return (err <= maxError * (1 + Math.abs(x)));
	}

	/**
	 * Performs a relative error test for two values.
	 * @param {Number} maxError specifies the maximum relative error to be accepted.
	 * @param {Number} a first value.
	 * @param {Number} b second value.
	 * @return {Boolean} true, if the relative error is smaller than the specified maxError.
	 */
	function relativeErrorTest(maxError, a, b)
	{
		var diff;

		// shortcut, handles NaN and infinities
		if (a === b)
			return true;

		diff = Math.abs(a - b);

		// relative error is less meaningful here (a and b are extremely close to zero)
		if (diff < maxError * Number.MIN_NORMAL)
			return true;

		// use relative error
		a = Math.abs(a);
		b = Math.abs(b);

		if (diff < maxError * Math.max(a, b))
			return true;

		return false;
	}

	/**
	 * Creates a comparision table with the specified iterations.
	 *
	 * @param {Array.<Object>} iterations contains the iterations objects to be compared
	 * @param {Number} precision will be used to convert numbers to strings
	 * @param {String} format specifies the desired output type: 'text', 'latex' or 'html'
	 * @return {String} the comparision table in the desired format
	 */
	function compare(iterations, precision, format)
	{
		if (!Array.isArray(iterations))
		{
			return undefined;
		}

		if (!Number.isFinite(precision))
		{
			precision = 6;
		}

		if (['text', 'latex', 'html'].indexOf(format) === -1)
		{
			format = 'text';
		}

		var maxSteps = iterations[0].values.length;
		var maxWidths = [];
		// compute the max width for each column and maximum steps
		for (var i = 0; i < iterations.length; i++)
		{
			if (iterations[i].values.length > maxSteps)
			{
				maxSteps = iterations[i].values.length;
			}

			maxWidths.push(iterations[i].values[0].toFixed(precision).length);
			for (var step = 1; step < iterations[i].values.length; step++)
			{
				var len = iterations[i].values[step].toFixed(precision).length;
				if (len > maxWidths[i])
				{
					maxWidths[i] = len;
				}
			}
		}

		var stepWidth = maxSteps.toString().length;
		var ret = '';
		var line = '';

		// helper function to increase the width of a string
		function toFixedWidth(s, w)
		{
			while (s.length < w)
			{
				s = ' ' + s;
			}
			return s;
		}

		// output the table in text format
		if (format === 'text')
		{
			for (var step = 0; step < maxSteps; step++)
			{
				line = toFixedWidth(step.toString(), stepWidth);
				// output a single row(line) of the table
				for (var i = 0; i < iterations.length; i++)
				{
					line += ' ';
					if (step < iterations[i].values.length)
					{
						line += toFixedWidth(iterations[i].values[step].toFixed(precision), maxWidths[i]);
					}
					else
					{
						line += toFixedWidth(' ', maxWidths[i]);
					}
				}
				ret += line + '\n';
			}
		}
		// output the table in latex format
		else if (format === 'latex')
		{
			// output table header
			ret += '\\begin{longtable}{|r|'
			for (var i = 0; i < iterations.length; i++)
			{
				ret += 'r';
			}
			ret += '|}\n\\hline\n';

			for (var step = 0; step < maxSteps; step++)
			{
				line = toFixedWidth(step.toString(), stepWidth) + ' ';
				// output a single row(line) of the table
				for (var i = 0; i < iterations.length; i++)
				{
					line += " & ";
					if (step < iterations[i].values.length)
					{
						line += toFixedWidth(iterations[i].values[step].toFixed(precision), maxWidths[i]);
					}
					else
					{
						line += toFixedWidth('~', maxWidths[i]);
					}
				}
				ret += line + ' \\\\\n';
			}

			// output table footer
			ret += '\\hline\n\\end{longtable}';
		}
		// output the table in html format
		else if (format === 'html')
		{
			throw { errorMessage: 'unimplemented' };
		}

		return ret;
	}

	/** @private util method used to validate the iteration function argument and the initial aproximation.
	 * @param {Function} f function to be validate.
	 * @param {Number} nargs number of expected arguments for specified function.
	 * @param {Number} x0 the initial approximation to be validated.
	 * @return undefined.
	 * @throws an object containing an error description in case of validation error.
	 */
	function validatefx0(f, nargs, x0)
	{
		// validate input function
		if (typeof f !== 'function')
		{
			throw { errorMessage : 'A function is expected.', errorArgument: 'f' };
		}
		else if (f.length !== nargs)
		{
			if (nargs === 1)
				throw { errorMessage : 'The function should have exactly 1 argument.', errorArgument: 'f' };
			throw { errorMessage : 'The function should have exactly ' + nargs + ' arguments.', errorArgument: 'f' };
		}

		// validate initial value
		if (!Number.isFinite(x0))
		{
			throw { errorMessage : 'A finite real number is expected.', errorArgument: 'x0' };
		}
	}

	/**
	 * @private method which computes a fixed point using a fixed point iteration.
	 * @param {Function} f is the function to be iterated.
	 * @param {Number} x0 is the initial approximation.
	 * @param {Object} options contains additional optional parameters.
	 * @param {Number} options.maxError specifies the maximum accepted error for the computed fixed point.
	 *		default value is 1e-7;
	 * @param {Number} options.maxSteps specifies the maximum number of steps after which the algorithm is stopped
	 *		if the desired precision is not acheived; default value is 1000.
	 *	@param {Boolean} options.checkCycles specifies weather or not to check for cycles;
	 *		checking for cycles increases the complexity to O(n^2); default value is true.
	 *	@param {Function} options.convergenceTest specifies the convergence test to be performed;
	 *		this can be one of the predefined error testing functions: 
	 *		fixpoint.errtest.absolute, fixpoint.errtest.relative, fixpoint.errtest.mixed (which is also the default);
	 *		this can also be any custom function which will be called with the arguments: maxError, x, xprev1, xprev2, values;
	 *		maxError is the specified parameter options.maxError; x is the current approximation; 
	 *		xprev1 and xprev2 are the previous two approximations; values is the complete list of approximations;
	 * @return {Object} the result of the iteration; will contain the following fields:
	 *  - {Number} xn the final approximation;
	 *	 - {Array.<Number>} values an array with the intermediate approximations;
	 *	 - {Number} numSteps the number of iterations steps performed ;
	 *	 - {Number} x0 the initial approximation used;
	 *	 - {String} warningMessage a possible warning message;
	 *	 - {String} errorMessage a possible error message;
	 *	 - {String} errorField will contain the name of invalid parameter in case of validation errors;
	 */
	function iterate(f, x0, options)
	{
		options = options || {};

		// set default value for maxError
		var maxError = defaultOptions.maxError;
		// validate error objective
		if (options.maxError != null)
		{
			if (!Number.isFinite(options.maxError))
			{
				throw { errorMessage : 'A finite positive real number is expected.', errorArgument: 'options.maxError' };
			}
			else if (options.maxError <= 0)
			{
				throw { errorMessage : 'A positive real number is expected.', errorArgument: 'options.maxError' };
			}
			else if (options.maxError < Number.MACHINE_EPSILON)
			{
				throw { errorMessage : 'A positive real number greater than machine epsilon is expected.', errorArgument: 'options.maxError' };
			}
			maxError = options.maxError;
		}

		// set default value for max iterations
		var maxSteps = defaultOptions.maxSteps;
		// validate maxSteps
		if (options.maxSteps != null)
		{
			if (!Number.isFinite(options.maxSteps))
			{
				throw { errorMessage : 'A finite number is expected.', errorArgument: 'options.maxSteps' };
			}
			else if (options.maxSteps < 1)
			{
				throw { errorMessage : 'A number greater than 1 is expected.', errorArgument: 'options.maxSteps' };
			}
			maxSteps = options.maxSteps;
		}

		// set default value for cycle checking option 
		var checkCycles = true;
		// validate cycle checking option
		if (options.checkCycles != null)
		{
			if (typeof options.checkCycles !== 'boolean')
			{
				throw { errorMessage : 'A boolean value is expected.', errorArgument: 'options.checkCycles' };
			}
			checkCycles = options.checkCycles;
		}

		// set default value for convergence test
		var convergenceTest = defaultOptions.convergenceTest;
		// validate convergence test option
		if (options.convergenceTest != null)
		{
			if (typeof options.convergenceTest !== 'function')
			{
				throw { errorMessage : 'A function is expected.', errorArgument : 'options.convergenceTest' };
			}
			else if (options.convergenceTest.length < 3)
			{
				throw { errorMessage : 'The function should have at least 3 arguments.', errorArgument: 'options.convergenceTest' };
			}
			convergenceTest = options.convergenceTest;
		}

		var res = {};

		// check for additional invalid arguments
		for (var arg in options)
		{
			if (options.hasOwnProperty(arg))
			{
				if (!defaultOptions.hasOwnProperty(arg))
				{
					res.warningMessage = 'Invalid optional argument found: ' + arg + '.';
					break;
				}
			}
		}

		// helper variables
		var values = [x0];
		var x = x0;
		var xprev1 = x0;
		var xprev2 = x0;
		var n = 0;
		var stop = false; 

		// algorithm code
		while (!stop)
		{
			// perform an iteration step
			x = f(x, n);
			// store last result
			values.push(x);
			n++;
			// perform the specified convergence test and stop if it is successful
			if (convergenceTest(maxError, x, xprev1, xprev2, values))
			{
				stop = true;
			}
			// check max number of iterations
			else if (n === maxSteps)
			{
				res.errorMessage = 'Maximum number of iterations was reached.';
				stop = true;
			}
			// check for overflows and undefined operations
			if (!Number.isFinite(x))
			{
				res.errorMessage = 'Iteration is divergent (numerical error).';
				stop = true;
			}
			// check if the sequence already contains the current value
			else if (checkCycles)
			{
				for (var i = 0; i < n; i++)
				{
					if (x === values[i])
					{
						res.errorMessage = 'Iteration is divergent '
							+ '(cycle detected between iterations #' + i.toString()
							+ ' and #' + n.toString() + ').';
						stop = true;
						break;
					}
				}
			}
			// save the values for the last two iterations
			// these may be used for the convergence test
			xprev2 = xprev1;
			xprev1 = x;
		}

		// fill result
		res.values = values;
		res.numSteps = n;
		res.x0 = x0;
		if (res.errorMessage === undefined)
		{
			res.xn = x;
		}

		return res;
	}	

	/** Will contain the public interface of the fixpoint module. */
	var module = {};

	/** @public method compare; @see also #compare. */
	module.compare = compare;

	/**
	 * @public method which computes a fixed point using any generic iteration formula.
	 * For details @see also #iterate.
	 */
	module.iterate = function(f, x0, options)
	{
		try
		{
			validatefx0(f, 2, x0);
			return iterate(f, x0, options);
		}
		catch (err)
		{
			return err;
		}
	}

	/** 
	 * @public method which computes a fixed point using the Picard iteration; @see also #iterate.
	 * @param {Function} f is the function to be iterated.
	 * @param {Number} x0 is the initial approximation.
	 * @param {Object} options will contain additional optional parameters.
	 * @return {Object} iteration result.
	 */
	module.picard = function(f, x0, options)
	{
		try
		{
			validatefx0(f, 1, x0);
			return iterate(f, x0, options);
		}
		catch (err)
		{
			return err;
		}
	}

	/** 
	* @public method which computes a fixed point using the Krasnoselskii iteration; @see also #iterate.
	* @param {Function} f is the function to be iterated.
	* @param {Number} lambda is number between 0 and 1 (the constant in the Krasnoselskii formula)
	* @param {Number} x0 is the initial approximation.
	* @param {Object} options will contain additional optional parameters.
	* @return {Object} iteration result.
	*/
	module.krasnoselskii = function(f, lambda, x0, options)
	{
		function K(x)
		{
			return (1 - lambda) * x + lambda * f(x);
		}

		try
		{
			validatefx0(f, 1, x0);
			// validate lambda constant
			if (!Number.isFinite(lambda))
			{
				throw { errorMessage : 'A finite real number is expected.', errorArgument: 'lambda' };
			} 
			if (lambda < 0 || lambda > 1)
			{
				throw { errorMessage : 'A real number between 0 and 1 is expected.', errorArgument: 'lambda' };
			}
			return iterate(K, x0, options);
		}
		catch (err)
		{
			return err;
		}
	}

	/** 
	* @public method which computes a fixed point using the Mann iteration; @see also #iterate.
	* @param {Function} f is the function to be iterated.
	* @param {Function} alphan is the formula for the sequence in the Mann iteration.
	* @param {Number} x0 is the initial approximation.
	* @param {Object} options will contain additional optional parameters.
	* @return {Object} iteration result.
	*/
	module.mann = function(f, alphan, x0, options)
	{
		function M(x, n)
		{
			var a = alphan(n);
			return (1 - a) * x + a * f(x);
		}

		try
		{
			validatefx0(f, 1, x0);
			// validate alphan
			if (typeof f !== 'function')
			{
				throw { errorMessage : 'A function is expected.', errorArgument: 'alphan' };
			}
			else if (f.length !== 1)
			{
				throw { errorMessage : 'The function should have exactly 1 argument.', errorArgument: 'alphan' };
			}
			return iterate(M, x0, options);
		}
		catch (err)
		{
			return err;
		}
	}

	/** 
	* @public method which computes a fixed point using the Ishikawa iteration; @see also #iterate.
	* @param {Function} f is the function to be iterated.
	* @param {Function} alphan is the formula for the sequence in the Ishikawa iteration.
	* @param {Function} betan is the formula for the sequence in the Ishikawa iteration.
	* @param {Number} x0 is the initial approximation.
	* @param {Object} options will contain additional optional parameters.
	* @return {Object} iteration result.
	*/
	module.ishikawa = function(f, alphan, betan, x0, options)
	{
		function I(x, n)
		{
			var a = alphan(n);
			var b = betan(n);
			var y = (1 - b) * x + b * f(x);
			var r = (1 - a) * x + a * f(y);
			return r;
		}

		try
		{
			validatefx0(f, 1, x0);
			// validate alphan
			if (typeof f !== 'function')
			{
				throw { errorMessage : 'A function is expected.', errorArgument: 'alphan' };
			}
			else if (f.length !== 1)
			{
				throw { errorMessage : 'The function should have exactly 1 argument.', errorArgument: 'alphan' };
			}
			// validate betan
			if (typeof f !== 'function')
			{
				throw { errorMessage : 'A function is expected.', errorArgument: 'betan' };
			}
			else if (f.length !== 1)
			{
				throw { errorMessage : 'The function should have exactly 1 argument.', errorArgument: 'betan' };
			}
			return iterate(I, x0, options);
		}
		catch (err)
		{
			return err;
		}
	}

	/** Submodule errtest will contain error testing methods. */
	module.errtest = {};
	/** @public method which performs absolute error testing; @see #absoluteErrorTest. */
	module.errtest.absolute = absoluteErrorTest;
	/** @public method which performs absolute error testing; @see #relativeErrorTest. */
	module.errtest.relative = relativeErrorTest;
	/** @public method which performs absolute error testing; @see #mixedErrorTest. */
	module.errtest.mixed = mixedErrorTest;

	return module;
}();
