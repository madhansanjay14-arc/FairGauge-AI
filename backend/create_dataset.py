import csv
import random

random.seed(42)

with open("datasets/hiring_data.csv", "w", newline="") as file:

    writer = csv.writer(file)

    writer.writerow([
        "gender",
        "experience",
        "test_score",
        "interview_score",
        "hired"
    ])

    for i in range(500):

        gender = random.choice(["Male", "Female"])

        experience = random.randint(0, 10)
        test_score = random.randint(40, 100)
        interview_score = random.randint(40, 100)

        # Synthetic hiring decision
        score = (
            experience * 2
            + test_score * 0.4
            + interview_score * 0.4
        )

        # Intentionally introduce a bias for demonstration
        if gender == "Male":
            score += 8

        hired = 1 if score >= 65 else 0

        writer.writerow([
            gender,
            experience,
            test_score,
            interview_score,
            hired
        ])

print("Synthetic hiring dataset created successfully!")