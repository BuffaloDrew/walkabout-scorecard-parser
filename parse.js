import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const argv = yargs(hideBin(process.argv))
  .option('format', {
    alias: 'f',
    type: 'boolean',
    description: 'Format the output JSON',
    default: false,
  })
  .option('no-animation', {
    alias: 'n',
    type: 'boolean',
    description: 'Disable the loading animation',
    default: false,
  })
  .help()
  .alias('help', 'h')
  .parse();

async function processImage(imagePath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    let processedImage = image;
    const mediaType = 'image/jpeg';

    // Convert to JPEG if the image is not already JPEG
    if (metadata.format !== 'jpeg') {
      processedImage = image.jpeg();
    }

    const buffer = await processedImage.toBuffer();

    return {
      buffer,
      mediaType,
      filename: path.basename(imagePath, path.extname(imagePath)),
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

async function parseScorecard(imagePaths) {
  let imageDataArray = [];
  try {
    for (const imagePath of imagePaths) {
      const imageData = await processImage(imagePath);
      imageDataArray.push(imageData);
    }
  } catch (error) {
    console.error('Error processing images:', error);
    process.exit(1);
  }

  const prompt = `Parse the following Walkabout mini golf scorecard images and output the data for each image in this JSON format:

{
  "image1": {
    "course": {
      "name": "Course Name",
      "holes": [par1, par2, ..., par18]
    },
    "players": {
      "player1": [score1, score2, ..., score18],
      "player2": [score1, score2, ..., score18],
      // ... additional players if present
    }
  },
  "image2": {
    // ... similar structure for the second image
  },
  // ... and so on for all images
}

Ensure the JSON is correctly formatted and includes all visible data from each scorecard. Only include JSON in your response.`;

  try {
    const spinner = ora('Parsing scorecards...').start();
    if (argv.noAnimation) {
      spinner.stop();
    }

    const content = [
      { type: 'text', text: prompt },
      ...imageDataArray.map((imageData) => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageData.mediaType,
          data: imageData.buffer.toString('base64'),
        },
      })),
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2500,
      messages: [{ role: 'user', content }],
    });

    if (!argv.noAnimation) {
      spinner.succeed('Scorecards parsed successfully!');
    }

    const parsedData = JSON.parse(response.content[0].text);

    // Rename keys to match filenames
    const renamedData = {};
    Object.keys(parsedData).forEach((key, index) => {
      renamedData[imageDataArray[index].filename] = parsedData[key];
    });

    return argv.format
      ? JSON.stringify(renamedData, null, 2)
      : JSON.stringify(renamedData);
  } catch (error) {
    if (!argv.noAnimation) {
      ora().fail('Error parsing scorecards');
    }
    console.error('Error details:', error);
    process.exit(1);
  }
}

async function main() {
  if (argv._.length < 1 || argv._.length > 5) {
    console.error(
      'Usage: node parse.js <path_to_scorecard_image1> [path_to_scorecard_image2 ...] [options]',
    );
    console.error('You must provide at least 1 and at most 5 image paths.');
    process.exit(1);
  }

  const imagePaths = argv._;
  for (const imagePath of imagePaths) {
    if (!fs.existsSync(imagePath)) {
      console.error(`File not found: ${imagePath}`);
      process.exit(1);
    }
  }

  try {
    const result = await parseScorecard(imagePaths);
    console.log(result);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main();
