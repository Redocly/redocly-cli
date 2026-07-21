// If you have different SDK languages edit this array
const sdkLanguages = ['bash', 'javascript', 'python', 'ruby', 'java', 'kotlin'];

export default function CheckSDKCoverage() {
  return {
    XCodeSampleList: {
      enter(codeSampleList, ctx) {
        // Make sure the list contains at least one bash sample
        const hasBashSample = codeSampleList.some((codeSample) => {
          return codeSample.lang === 'bash';
        });
        //check for the other SDK languages by making an array of the lang fields from the code samples
        const langArray = codeSampleList.map((codeSample) => {
          return codeSample.lang;
        });
        //compare the sdkLanguages array with the langArray to find the missing languages, and save them to an array
        const missingLanguages = sdkLanguages.filter((lang) => {
          return !langArray.includes(lang);
        });
        //if there are missing languages, report them as warnings
        // might want to make this less verbose later
        if (missingLanguages.length > 0) {
          ctx.report({
            message: `Only ${langArray.length} code samples: ${langArray.join(
              ', '
            )} but is missing the following SDK languages: ${missingLanguages.join(', ')}`,
          });
        }
      },
    },
  };
}
