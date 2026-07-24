// If you have different SDK languages edit this array
const sdkLanguages = ['bash', 'javascript', 'python', 'ruby', 'java', 'kotlin'];

export default function CheckSDKCoverage() {
  return {
    XCodeSampleList: {
      enter(codeSampleList, ctx) {
        //check for the SDK languages by making an array of the lang fields from the code samples
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
