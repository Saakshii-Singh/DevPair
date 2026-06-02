const questions = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays & Hashing",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]"
      }
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Write your JavaScript code here
  
}`,
      python: `def two_sum(nums, target):
    # Write your Python code here
    pass`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your C++ code here
        
    }
};`
    },
    testCases: [
      {
        input: [[2, 7, 11, 15], 9],
        expectedOutput: [0, 1],
        inputStr: "[2, 7, 11, 15], 9"
      },
      {
        input: [[3, 2, 4], 6],
        expectedOutput: [1, 2],
        inputStr: "[3, 2, 4], 6"
      },
      {
        input: [[3, 3], 6],
        expectedOutput: [0, 1],
        inputStr: "[3, 3], 6"
      }
    ],
    handlerName: "twoSum"
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stacks",
    description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    examples: [
      {
        input: 's = "()"',
        output: "true"
      },
      {
        input: 's = "()[]{}"',
        output: "true"
      },
      {
        input: 's = "(]"',
        output: "false"
      }
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'."
    ],
    starterCode: {
      javascript: `function isValid(s) {
  // Write your JavaScript code here
  
}`,
      python: `def is_valid(s):
    # Write your Python code here
    pass`,
      cpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your C++ code here
        
    }
};`
    },
    testCases: [
      {
        input: ["()"],
        expectedOutput: true,
        inputStr: '"()"'
      },
      {
        input: ["()[]{}"],
        expectedOutput: true,
        inputStr: '"()[]{}"'
      },
      {
        input: ["(]"],
        expectedOutput: false,
        inputStr: '"(]"'
      },
      {
        input: ["([)]"],
        expectedOutput: false,
        inputStr: '"([)]"'
      }
    ],
    handlerName: "isValid"
  },
  {
    id: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Sliding Window",
    description: "Given a string `s`, find the length of the longest substring without repeating characters.",
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: "The answer is \"abc\", with the length of 3."
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: "The answer is \"b\", with the length of 1."
      }
    ],
    constraints: [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces."
    ],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {
  // Write your JavaScript code here
  
}`,
      python: `def length_of_longest_substring(s):
    # Write your Python code here
    pass`,
      cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your C++ code here
        
    }
};`
    },
    testCases: [
      {
        input: ["abcabcbb"],
        expectedOutput: 3,
        inputStr: '"abcabcbb"'
      },
      {
        input: ["bbbbb"],
        expectedOutput: 1,
        inputStr: '"bbbbb"'
      },
      {
        input: ["pwwkew"],
        expectedOutput: 3,
        inputStr: '"pwwkew"'
      },
      {
        input: [""],
        expectedOutput: 0,
        inputStr: '""'
      }
    ],
    handlerName: "lengthOfLongestSubstring"
  },
  {
    id: "palindrome-number",
    title: "Palindrome Number",
    difficulty: "Easy",
    category: "Math",
    description: "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward. For example, `121` is a palindrome while `123` is not.",
    examples: [
      {
        input: "x = 121",
        output: "true",
        explanation: "121 reads as 121 from left to right and from right to left."
      },
      {
        input: "x = -121",
        output: "false",
        explanation: "From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome."
      }
    ],
    constraints: [
      "-2^31 <= x <= 2^31 - 1"
    ],
    starterCode: {
      javascript: `function isPalindrome(x) {
  // Write your JavaScript code here
  
}`,
      python: `def is_palindrome(x):
    # Write your Python code here
    pass`,
      cpp: `class Solution {
public:
    bool isPalindrome(int x) {
        // Write your C++ code here
        
    }
};`
    },
    testCases: [
      {
        input: [121],
        expectedOutput: true,
        inputStr: "121"
      },
      {
        input: [-121],
        expectedOutput: false,
        inputStr: "-121"
      },
      {
        input: [10],
        expectedOutput: false,
        inputStr: "10"
      }
    ],
    handlerName: "isPalindrome"
  }
];

module.exports = questions;
